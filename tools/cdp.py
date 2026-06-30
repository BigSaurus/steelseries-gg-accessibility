#
#  Tiny CDP helper for SteelSeries GG: connect to a specific page target (by
#  url substring or id) and evaluate JS. Prints the JSON-ish result.
#
#    python cdp.py targets
#    python cdp.py eval --url app.asar/render -e "location.href"
#    python cdp.py eval --url app.asar/render -f script.js
#
import argparse, json, sys, urllib.request
import websocket  # websocket-client


def targets(port):
    with urllib.request.urlopen("http://127.0.0.1:%d/json/list" % port, timeout=8) as r:
        return json.loads(r.read().decode("utf-8"))


def pick(port, url_sub=None, tid=None):
    for t in targets(port):
        if t.get("type") != "page":
            continue
        if tid and t.get("id") == tid:
            return t
        if url_sub and url_sub in (t.get("url") or ""):
            return t
    return None


class CDP:
    def __init__(self, ws_url):
        self.ws = websocket.create_connection(ws_url, max_size=None, timeout=20,
                                              suppress_origin=True)
        self._id = 0
        self._send("Runtime.enable")

    def _send(self, method, **params):
        self._id += 1
        mid = self._id
        self.ws.send(json.dumps({"id": mid, "method": method, "params": params}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get("id") == mid:
                if "error" in msg:
                    raise RuntimeError("%s -> %s" % (method, msg["error"]))
                return msg.get("result", {})

    def evaluate(self, expr):
        res = self._send("Runtime.evaluate", expression=expr, returnByValue=True,
                         awaitPromise=True)
        if "exceptionDetails" in res:
            raise RuntimeError("JS exception: %s" %
                               json.dumps(res["exceptionDetails"], indent=2)[:2000])
        return res.get("result", {}).get("value")

    def close(self):
        try: self.ws.close()
        except Exception: pass


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("targets")
    e = sub.add_parser("eval")
    e.add_argument("--port", type=int, default=9222)
    e.add_argument("--url", default=None)
    e.add_argument("--id", default=None)
    e.add_argument("-e", "--expr", default=None)
    e.add_argument("-f", "--file", default=None)
    args = ap.parse_args()

    port = 9222
    if args.cmd == "targets":
        for t in targets(port):
            print(t.get("type"), "|", (t.get("title") or "")[:40], "|",
                  (t.get("url") or "")[:80], "|", t.get("id"))
        return

    t = pick(port, args.url, args.id)
    if not t:
        print("!! no page target matching url=%r id=%r" % (args.url, args.id))
        sys.exit(2)
    expr = args.expr
    if args.file:
        with open(args.file, "r", encoding="utf-8") as fh:
            expr = fh.read()
    c = CDP(t["webSocketDebuggerUrl"])
    try:
        out = c.evaluate(expr)
    finally:
        c.close()
    if isinstance(out, (dict, list)):
        print(json.dumps(out, indent=2, ensure_ascii=False))
    else:
        print(out)


if __name__ == "__main__":
    main()
