//
//  SteelSeries GG accessibility launch wrapper.
//
//  SteelSeries' GGEZ watchdog respawns the host (SteelSeriesGG.exe), and the
//  host spawns the GUI client itself, building the command line. There is no
//  supported way to pass Chromium flags to that client. So we sit in front of
//  it: this wrapper is installed AT the original client path
//  (SteelSeriesGGClient.exe); the real binary is renamed to
//  SteelSeriesGGClient-real.exe. Whenever the host launches the client, we get
//  invoked instead, append the accessibility / remote-debugging flags, and
//  exec the real binary in our place (waiting on it so the host sees the same
//  process lifetime).
//
//  Renderer/GPU/utility children are spawned by the Electron browser process
//  using its own exe path (the -real binary), so they never hit this wrapper.
//  As a belt-and-suspenders guard we still pass through unchanged any launch
//  that carries a Chromium --type= switch.
//
using System;
using System.Diagnostics;
using System.IO;

class Wrapper
{
    // Flags we inject onto the main browser process launch.
    const string DEBUG_FLAGS =
        " --remote-debugging-port=9222 --remote-allow-origins=* --force-renderer-accessibility";

    static int Main()
    {
        string selfDir = AppDomain.CurrentDomain.BaseDirectory;
        string realExe = Path.Combine(selfDir, "SteelSeriesGGClient-real.exe");

        // Full original command line, e.g.  "C:\...\SteelSeriesGGClient.exe" <args...>
        string full = Environment.CommandLine;
        string tail = StripProgramToken(full);

        // Child processes (renderer/gpu/utility) carry --type=. Pass them
        // through untouched so we never disturb Chromium's multi-process model.
        bool isChild = tail.IndexOf("--type=", StringComparison.OrdinalIgnoreCase) >= 0;

        string args = isChild ? tail : (tail + DEBUG_FLAGS);

        var psi = new ProcessStartInfo
        {
            FileName = realExe,
            Arguments = args,
            UseShellExecute = false,
            WorkingDirectory = selfDir,
        };

        try
        {
            using (var p = Process.Start(psi))
            {
                p.WaitForExit();
                return p.ExitCode;
            }
        }
        catch (Exception ex)
        {
            // Last-resort: write a breadcrumb next to the wrapper so a failed
            // launch is diagnosable instead of silently vanishing.
            try
            {
                File.AppendAllText(Path.Combine(selfDir, "ss-a11y-wrapper-error.log"),
                    DateTime.Now + "  " + ex + Environment.NewLine);
            }
            catch { }
            return 1;
        }
    }

    // Remove the leading program token (quoted or not) from a command line,
    // returning the remaining argument tail with its original spacing/quoting.
    static string StripProgramToken(string cmd)
    {
        if (string.IsNullOrEmpty(cmd)) return "";
        int i = 0;
        if (cmd[0] == '"')
        {
            i = 1;
            while (i < cmd.Length && cmd[i] != '"') i++;
            if (i < cmd.Length) i++; // skip closing quote
        }
        else
        {
            while (i < cmd.Length && cmd[i] != ' ' && cmd[i] != '\t') i++;
        }
        return cmd.Substring(i).TrimStart();
    }
}
