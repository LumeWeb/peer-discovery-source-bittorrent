import DHT from "bittorrent-dht";
import { Peer, PeerDiscovery } from "@lumeweb/peer-discovery";
import eddsa from "bittorrent-dht-sodium";
import sha from "sha.js";
import * as Buffer from "buffer";
import b4a from "b4a";

export default class BitTorrentSource {
  private _discovery: PeerDiscovery;
  private _dht: DHT;
  private _readyResolve: Function;
  private _ready: Promise<any> = new Promise((resolve) => {
    this._readyResolve = resolve;
  });

  constructor(discovery: PeerDiscovery, bootstrap?: string[]) {
    this._discovery = discovery;
    this._dht = new DHT({ bootstrap, verify: eddsa.verify });
    this._dht.on("ready", this._readyResolve);
  }

  public async discover(pubkey: Buffer): Promise<boolean | Peer> {
    await this._ready;

    const hash = sha("sha1").update(pubkey).digest();

    return new Promise<boolean | Peer>((resolve, reject) => {
      this._dht.get(hash, function (err, res) {
        if (err) {
          console.log(err);
          reject(false);
          return;
        }

        const json = JSON.parse(b4a.from(res.v).toString());

        resolve({ host: json?.host, port: json?.port });
      });
    });
  }

  public register(name: string): boolean {
    return this._discovery.registerSource(name, this.discover.bind(this));
  }
}
