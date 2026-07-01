//
//  Accessible-EQ injector daemon for SteelSeries GG (C# / no runtime deps).
//
//  Polls the CDP endpoint and evaluates eq_sync.js on
//  every "deviceConfig" page, so the accessible band controls survive reloads,
//  SPA navigation, and newly opened device windows. Uses only the .NET Framework
//  that ships with Windows (ClientWebSocket + JavaScriptSerializer), so an end
//  user needs nothing but SteelSeries GG. Reads eq_sync.js from its own folder.
//
//  Polls fast while GG is up, backs off to a slow idle poll while GG is closed.
//  Built by build.ps1 to tools\eq_daemon.exe (gitignored; ship source).
//
using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;

class Daemon
{
    const int Port = 9222;
    const int PollActiveMs = 1500;   // GG up
    const int PollIdleMs = 5000;     // GG closed
    static string SyncJs;
    static string SelfDir;

    static void Main()
    {
        SelfDir = AppDomain.CurrentDomain.BaseDirectory;
        try { SyncJs = File.ReadAllText(Path.Combine(SelfDir, "eq_sync.js")); }
        catch (Exception ex) { Log("cannot read eq_sync.js: " + ex.Message); return; }

        while (true)
        {
            int delay = PollIdleMs;
            try
            {
                foreach (string wsUrl in DeviceConfigPages())   // throws if no CDP
                {
                    delay = PollActiveMs;                        // GG is up
                    try { Inject(wsUrl); } catch { /* page may have closed */ }
                }
            }
            catch { /* GG (or its debug port) not up right now */ }
            Thread.Sleep(delay);
        }
    }

    static List<string> DeviceConfigPages()
    {
        string json;
        using (var wc = new WebClient())
            json = wc.DownloadString("http://127.0.0.1:" + Port + "/json/list");
        var ser = new JavaScriptSerializer(); ser.MaxJsonLength = int.MaxValue;
        var arr = (object[])ser.DeserializeObject(json);
        var res = new List<string>();
        foreach (var item in arr)
        {
            var t = item as Dictionary<string, object>;
            if (t == null) continue;
            object type, url, ws;
            t.TryGetValue("type", out type); t.TryGetValue("url", out url);
            t.TryGetValue("webSocketDebuggerUrl", out ws);
            if ((type as string) == "page" && url is string && ws is string &&
                ((string)url).Contains("deviceConfig"))
                res.Add((string)ws);
        }
        return res;
    }

    static void Inject(string wsUrl)
    {
        using (var ws = new ClientWebSocket())
        using (var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10)))
        {
            var ct = cts.Token;
            ws.ConnectAsync(new Uri(wsUrl), ct).GetAwaiter().GetResult();
            Send(ws, "{\"id\":1,\"method\":\"Runtime.enable\"}", ct);

            var ser = new JavaScriptSerializer(); ser.MaxJsonLength = int.MaxValue;
            var pars = new Dictionary<string, object> {
                { "expression", SyncJs }, { "returnByValue", true }, { "awaitPromise", true }
            };
            var msg = new Dictionary<string, object> {
                { "id", 2 }, { "method", "Runtime.evaluate" }, { "params", pars }
            };
            Send(ws, ser.Serialize(msg), ct);

            DateTime deadline = DateTime.UtcNow.AddSeconds(10);
            while (DateTime.UtcNow < deadline)
            {
                string resp = Receive(ws, ct);
                if (resp == null || resp.Contains("\"id\":2")) break;
            }
            try { ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "", CancellationToken.None).GetAwaiter().GetResult(); }
            catch { }
        }
    }

    static void Send(ClientWebSocket ws, string text, CancellationToken ct)
    {
        var b = Encoding.UTF8.GetBytes(text);
        ws.SendAsync(new ArraySegment<byte>(b), WebSocketMessageType.Text, true, ct)
          .GetAwaiter().GetResult();
    }

    static string Receive(ClientWebSocket ws, CancellationToken ct)
    {
        var buf = new byte[16384]; var sb = new StringBuilder(); WebSocketReceiveResult r;
        do
        {
            r = ws.ReceiveAsync(new ArraySegment<byte>(buf), ct).GetAwaiter().GetResult();
            if (r.MessageType == WebSocketMessageType.Close) return null;
            sb.Append(Encoding.UTF8.GetString(buf, 0, r.Count));
        } while (!r.EndOfMessage);
        return sb.ToString();
    }

    static void Log(string msg)
    {
        try { File.AppendAllText(Path.Combine(SelfDir, "eq_daemon-error.log"),
                DateTime.Now + "  " + msg + Environment.NewLine); }
        catch { }
    }
}
