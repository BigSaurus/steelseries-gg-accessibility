#
#  Accessible-EQ injector daemon for SteelSeries GG.
#
#  Polls the CDP endpoint and evaluates eq_sync.js on every "deviceConfig" page
#  (so the accessible band sliders survive reloads, SPA navigation, and newly
#  opened device windows). Self-contained and lightweight.
#
#  Runs persistently (intended to be started at login): it polls fast while GG
#  is up and backs off to a slow idle poll while GG is closed, so it costs almost
#  nothing yet re-injects the moment GG (and its debug port) reappears.
#
import json, os, sys, time, urllib.request
import websocket  # websocket-client

PORT = 9222
POLL_ACTIVE = 1.5       # seconds between polls while GG is up
POLL_IDLE = 5.0         # seconds between polls while GG is closed
HERE = os.path.dirname(os.path.abspath(__file__))
SYNC_JS = open(os.path.join(HERE, "eq_sync.js"), "r", encoding="utf-8").read()


def targets():
    with urllib.request.urlopen("http://127.0.0.1:%d/json/list" % PORT, timeout=4) as r:
        return json.loads(r.read().decode("utf-8"))


def evaluate(ws_url, expr):
    ws = websocket.create_connection(ws_url, max_size=None, timeout=8, suppress_origin=True)
    try:
        ws.send(json.dumps({"id": 1, "method": "Runtime.enable"}))
        ws.send(json.dumps({"id": 2, "method": "Runtime.evaluate",
                            "params": {"expression": expr, "returnByValue": True,
                                       "awaitPromise": True}}))
        # drain until we see id==2
        deadline = time.time() + 8
        while time.time() < deadline:
            msg = json.loads(ws.recv())
            if msg.get("id") == 2:
                return msg.get("result", {}).get("result", {}).get("value")
    finally:
        ws.close()
    return None


def main():
    log = lambda *a: print("[eq-daemon]", *a, flush=True)
    log("started; polling CDP %d (active %ss / idle %ss)" % (PORT, POLL_ACTIVE, POLL_IDLE))
    while True:
        delay = POLL_IDLE
        try:
            ts = targets()
            delay = POLL_ACTIVE      # GG is up -> poll fast
            pages = [t for t in ts if t.get("type") == "page"
                     and "deviceConfig" in (t.get("url") or "")]
            for t in pages:
                try:
                    res = evaluate(t["webSocketDebuggerUrl"], SYNC_JS)
                    if res and '"state":"built"' in res:
                        log("injected panel into", t.get("title"))
                except Exception:
                    pass  # page may have closed mid-poll
        except Exception:
            pass  # GG (or its debug port) not up right now -> idle poll
        time.sleep(delay)


if __name__ == "__main__":
    main()
