const fs = require("fs");
const path = require("path");

// TTL tiers (ms)
const HOT_TTL = 60_000;       // 60s - profile, closest prayer, notifications
const WARM_TTL = 300_000;     // 5min - jurusan, kelas, lookup, academic-years
const COLD_TTL = 1_800_000;   // 30min - students list, analytics

const HOT_PATTERNS = ["/auth/profile", "/prayer-schedules/closest", "/prayer-times", "/notifications", "/prayer-types"];
const WARM_PATTERNS = ["/jurusan", "/kelas", "/lookup/", "/academic-years"];
const COLD_PATTERNS = ["/students", "/analytics/"];

function getTier(url) {
  if (HOT_PATTERNS.some(p => url.includes(p))) return { ttl: HOT_TTL, disk: false };
  if (WARM_PATTERNS.some(p => url.includes(p))) return { ttl: WARM_TTL, disk: false };
  if (COLD_PATTERNS.some(p => url.includes(p))) return { ttl: COLD_TTL, disk: true };
  return null; // not cacheable
}

class HybridCache {
  constructor() {
    this.memory = new Map(); // key -> { data, expires }
    this.maxMemory = 100;
    this.diskDir = null;
  }

  init(userDataPath) {
    this.diskDir = path.join(userDataPath, "api-cache");
    try { fs.mkdirSync(this.diskDir, { recursive: true }); } catch {}
  }

  get(url) {
    const tier = getTier(url);
    if (!tier) return null;

    // Check memory
    const memEntry = this.memory.get(url);
    if (memEntry && Date.now() < memEntry.expires) return memEntry.data;
    if (memEntry) this.memory.delete(url);

    // Check disk
    if (tier.disk && this.diskDir) {
      const filePath = this._diskPath(url);
      try {
        const raw = fs.readFileSync(filePath, "utf8");
        const entry = JSON.parse(raw);
        if (Date.now() < entry.expires) {
          // Promote to memory
          this._memSet(url, entry.data, entry.expires);
          return entry.data;
        }
        fs.unlinkSync(filePath);
      } catch {}
    }
    return null;
  }

  set(url, data) {
    const tier = getTier(url);
    if (!tier) return;
    const expires = Date.now() + tier.ttl;
    this._memSet(url, data, expires);
    if (tier.disk && this.diskDir) {
      try { fs.writeFileSync(this._diskPath(url), JSON.stringify({ data, expires })); } catch {}
    }
  }

  invalidate(pattern) {
    for (const key of this.memory.keys()) {
      if (key.includes(pattern)) this.memory.delete(key);
    }
    if (this.diskDir) {
      try {
        for (const file of fs.readdirSync(this.diskDir)) {
          const decoded = Buffer.from(file.replace(".json", ""), "base64url").toString();
          if (decoded.includes(pattern)) {
            try { fs.unlinkSync(path.join(this.diskDir, file)); } catch {}
          }
        }
      } catch {}
    }
  }

  _memSet(url, data, expires) {
    if (this.memory.size >= this.maxMemory) {
      const firstKey = this.memory.keys().next().value;
      this.memory.delete(firstKey);
    }
    this.memory.set(url, { data, expires });
  }

  _diskPath(url) {
    const encoded = Buffer.from(url).toString("base64url");
    return path.join(this.diskDir, `${encoded}.json`);
  }
}

module.exports = new HybridCache();
