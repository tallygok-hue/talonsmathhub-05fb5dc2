import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Weapon = { id: string; name: string; icon: string; dmg: number; cd: number; speed: number; spread: number; pellets: number; range: number };
const WEAPONS: Record<string, Weapon> = {
  pistol: { id: 'pistol', name: 'Pistol', icon: '🔫', dmg: 12, cd: 350, speed: 0.012, spread: 0.03, pellets: 1, range: 0.5 },
  smg: { id: 'smg', name: 'SMG', icon: '💨', dmg: 7, cd: 90, speed: 0.014, spread: 0.12, pellets: 1, range: 0.45 },
  shotgun: { id: 'shotgun', name: 'Shotgun', icon: '💥', dmg: 9, cd: 800, speed: 0.012, spread: 0.35, pellets: 6, range: 0.25 },
  sniper: { id: 'sniper', name: 'Sniper', icon: '🎯', dmg: 55, cd: 1500, speed: 0.03, spread: 0, pellets: 1, range: 1.2 },
  rocket: { id: 'rocket', name: 'Rocket', icon: '🚀', dmg: 40, cd: 1800, speed: 0.008, spread: 0, pellets: 1, range: 0.8 },
};
const LOOT_TYPES = ['smg', 'shotgun', 'sniper', 'rocket', 'medkit', 'shield'];
const MATCH_MS = 150_000;
const COLORS = ['#f43f5e', '#22d3ee', '#a3e635', '#facc15', '#c084fc', '#fb923c', '#34d399', '#60a5fa'];

type Player = { id: string; name: string; x: number; y: number; hp: number; sh: number; w: string; alive: boolean; color: string; kills: number; t: number };
type Bullet = { id: string; owner: string; x: number; y: number; vx: number; vy: number; dmg: number; life: number };
type Loot = { id: string; type: string; x: number; y: number };

const rid = () => Math.random().toString(36).slice(2, 10);

export function CursorBattlefront({ username, onClose }: { username: string; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hud, setHud] = useState({ hp: 100, sh: 0, w: 'pistol', alive: true, players: 1, aliveCount: 1, kills: 0, zone: 1, msg: '' });
  const [feed, setFeed] = useState<string[]>([]);

  useEffect(() => {
    const myId = rid();
    const me: Player = { id: myId, name: username, x: Math.random(), y: Math.random(), hp: 100, sh: 0, w: 'pistol', alive: true, color: COLORS[Math.floor(Math.random() * COLORS.length)], kills: 0, t: Date.now() };
    const others = new Map<string, Player>();
    let bullets: Bullet[] = [];
    let loot: Loot[] = [];
    let matchStart = Date.now();
    let lastShot = 0;
    let dir = { x: 1, y: 0 };
    let mouseDown = false;
    let msg = '';
    let msgUntil = 0;
    let lastSend = 0;
    let roundOverAt = 0;
    const pushFeed = (s: string) => setFeed((f) => [s, ...f].slice(0, 6));
    const flash = (s: string, ms = 2500) => { msg = s; msgUntil = Date.now() + ms; };

    const channel = supabase.channel('cursor-battlefront', { config: { broadcast: { self: false }, presence: { key: myId } } });
    const isHost = () => {
      const ids = [myId, ...others.keys()].sort();
      return ids[0] === myId;
    };
    const send = (event: string, payload: Record<string, unknown>) => channel.send({ type: 'broadcast', event, payload });
    const spawnLoot = () => {
      loot = Array.from({ length: 14 }, () => ({ id: rid(), type: LOOT_TYPES[Math.floor(Math.random() * LOOT_TYPES.length)], x: 0.05 + Math.random() * 0.9, y: 0.05 + Math.random() * 0.9 }));
    };
    const respawnMe = () => {
      Object.assign(me, { hp: 100, sh: 0, w: 'pistol', alive: true, kills: 0, x: Math.random(), y: Math.random() });
    };
    const startRound = () => {
      matchStart = Date.now(); spawnLoot(); roundOverAt = 0;
      send('round', { start: matchStart, loot });
      respawnMe(); flash('⚔️ New round! Grab loot!');
    };

    channel
      .on('broadcast', { event: 'pos' }, ({ payload }) => { const p = payload as Player; others.set(p.id, { ...p, t: Date.now() }); })
      .on('broadcast', { event: 'shot' }, ({ payload }) => { bullets.push(...(payload.b as Bullet[])); })
      .on('broadcast', { event: 'pick' }, ({ payload }) => { loot = loot.filter((l) => l.id !== payload.id); })
      .on('broadcast', { event: 'drop' }, ({ payload }) => { loot.push(payload as Loot); })
      .on('broadcast', { event: 'round' }, ({ payload }) => { matchStart = payload.start; loot = payload.loot; roundOverAt = 0; respawnMe(); flash('⚔️ New round! Grab loot!'); })
      .on('broadcast', { event: 'sync_req' }, () => { if (isHost()) send('sync', { start: matchStart, loot }); })
      .on('broadcast', { event: 'sync' }, ({ payload }) => { matchStart = payload.start; loot = payload.loot; })
      .on('broadcast', { event: 'kill' }, ({ payload }) => {
        if (payload.killer === myId) { me.kills++; flash(`💀 You eliminated ${payload.victimName}!`); }
        pushFeed(`${payload.killerName} 🔫 ${payload.victimName}`);
      })
      .on('broadcast', { event: 'win' }, ({ payload }) => { flash(`🏆 ${payload.name} wins! Next round soon…`, 5000); roundOverAt = Date.now(); })
      .on('presence', { event: 'leave' }, ({ key }) => { others.delete(key); })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ name: username });
          send('sync_req', {});
          setTimeout(() => { if (isHost() && loot.length === 0) { spawnLoot(); send('sync', { start: matchStart, loot }); } }, 1200);
        }
      });

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const resize = () => { canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight; };
    resize(); window.addEventListener('resize', resize);

    const onMove = (e: MouseEvent) => {
      if (!me.alive) return;
      const r = canvas.getBoundingClientRect();
      const nx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      const ny = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      const dx = nx - me.x, dy = ny - me.y, d = Math.hypot(dx, dy);
      if (d > 0.002) dir = { x: dx / d, y: dy / d };
      me.x = nx; me.y = ny;
    };
    const onDown = () => { mouseDown = true; };
    const onUp = () => { mouseDown = false; };
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);

    const zone = () => {
      const p = Math.min(1, (Date.now() - matchStart) / MATCH_MS);
      return { cx: 0.5, cy: 0.5, r: Math.max(0.04, 0.75 * (1 - p)) };
    };

    const shoot = () => {
      const w = WEAPONS[me.w]; const now = Date.now();
      if (now - lastShot < w.cd || !me.alive) return;
      lastShot = now;
      const base = Math.atan2(dir.y, dir.x);
      const b: Bullet[] = Array.from({ length: w.pellets }, () => {
        const a = base + (Math.random() - 0.5) * w.spread;
        return { id: rid(), owner: myId, x: me.x + Math.cos(a) * 0.015, y: me.y + Math.sin(a) * 0.015, vx: Math.cos(a) * w.speed, vy: Math.sin(a) * w.speed, dmg: w.dmg, life: Math.round(w.range / w.speed) };
      });
      bullets.push(...b); send('shot', { b });
    };

    const die = (killer: string, killerName: string) => {
      me.alive = false; me.hp = 0;
      flash(`☠️ Eliminated by ${killerName}`, 4000);
      send('kill', { killer, killerName, victimName: me.name });
      pushFeed(`${killerName} 🔫 ${me.name}`);
      if (me.w !== 'pistol') { const d = { id: rid(), type: me.w, x: me.x, y: me.y }; loot.push(d); send('drop', d); }
    };

    let raf = 0; let lastZoneTick = 0; let lastHud = 0;
    const loop = () => {
      const now = Date.now();
      const W = canvas.width, H = canvas.height, S = Math.min(W, H);
      for (const [id, p] of others) if (now - p.t > 5000) others.delete(id);
      if (mouseDown) shoot();

      // bullets
      bullets = bullets.filter((b) => {
        b.x += b.vx; b.y += b.vy; b.life--;
        if (b.life <= 0 || b.x < 0 || b.x > 1 || b.y < 0 || b.y > 1) return false;
        if (me.alive && b.owner !== myId && Math.hypot((b.x - me.x) * W, (b.y - me.y) * H) < 14) {
          let dmg = b.dmg; const absorbed = Math.min(me.sh, dmg); me.sh -= absorbed; dmg -= absorbed; me.hp -= dmg;
          if (me.hp <= 0) die(b.owner, others.get(b.owner)?.name || 'someone');
          return false;
        }
        if (b.owner === myId) for (const p of others.values()) if (p.alive && Math.hypot((b.x - p.x) * W, (b.y - p.y) * H) < 14) return false;
        return true;
      });

      // zone damage
      const z = zone();
      if (me.alive && now - lastZoneTick > 500) {
        lastZoneTick = now;
        if (Math.hypot(me.x - z.cx, me.y - z.cy) > z.r) { me.hp -= 4; if (me.hp <= 0) die('zone', 'the Storm'); }
      }

      // loot pickup
      if (me.alive) for (const l of loot) {
        if (Math.hypot((l.x - me.x) * W, (l.y - me.y) * H) < 20) {
          loot = loot.filter((x) => x.id !== l.id); send('pick', { id: l.id });
          if (l.type === 'medkit') { me.hp = Math.min(100, me.hp + 50); flash('❤️ +50 HP', 1200); }
          else if (l.type === 'shield') { me.sh = Math.min(100, me.sh + 50); flash('🛡️ +50 Shield', 1200); }
          else { me.w = l.type; flash(`${WEAPONS[l.type].icon} Picked up ${WEAPONS[l.type].name}`, 1200); }
          break;
        }
      }

      // network
      if (now - lastSend > 50) { lastSend = now; send('pos', { ...me }); }

      // host: round logic
      if (isHost()) {
        const all = [me, ...others.values()];
        const alive = all.filter((p) => p.alive);
        if (all.length >= 2 && alive.length <= 1 && !roundOverAt) {
          roundOverAt = now; const name = alive[0]?.name || 'Nobody';
          send('win', { name }); flash(`🏆 ${name} wins! Next round soon…`, 5000);
        }
        if (roundOverAt && now - roundOverAt > 5000) startRound();
        if (!roundOverAt && now - matchStart > MATCH_MS + 15000) startRound();
        if (all.length === 1 && !me.alive && now - (msgUntil - 4000) > 3000) startRound();
      }

      // draw
      ctx.fillStyle = '#0b1020'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      for (let i = 0; i <= 20; i++) { ctx.beginPath(); ctx.moveTo((i / 20) * W, 0); ctx.lineTo((i / 20) * W, H); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, (i / 20) * H); ctx.lineTo(W, (i / 20) * H); ctx.stroke(); }
      // storm
      ctx.save(); ctx.fillStyle = 'rgba(147,51,234,0.28)'; ctx.beginPath(); ctx.rect(0, 0, W, H);
      ctx.ellipse(z.cx * W, z.cy * H, z.r * W, z.r * H, 0, 0, Math.PI * 2, true); ctx.fill('evenodd');
      ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(z.cx * W, z.cy * H, z.r * W, z.r * H, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      // loot
      ctx.font = `${Math.round(S * 0.03)}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const l of loot) {
        const icon = l.type === 'medkit' ? '❤️' : l.type === 'shield' ? '🛡️' : WEAPONS[l.type].icon;
        const bob = Math.sin(now / 300 + l.x * 10) * 3;
        ctx.fillStyle = 'rgba(250,204,21,0.2)'; ctx.beginPath(); ctx.arc(l.x * W, l.y * H + bob, 18, 0, Math.PI * 2); ctx.fill();
        ctx.fillText(icon, l.x * W, l.y * H + bob);
      }
      // bullets
      for (const b of bullets) { ctx.fillStyle = b.owner === myId ? '#fde047' : '#f87171'; ctx.beginPath(); ctx.arc(b.x * W, b.y * H, b.dmg > 30 ? 5 : 3, 0, Math.PI * 2); ctx.fill(); }
      // players
      const drawP = (p: Player, self: boolean) => {
        if (!p.alive) { ctx.globalAlpha = 0.3; }
        const x = p.x * W, y = p.y * H;
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 4, y + 18); ctx.lineTo(x + 8, y + 11); ctx.lineTo(x + 15, y + 12); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = self ? '#fff' : '#000'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.font = '12px sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
        ctx.fillText(`${p.alive ? '' : '☠️ '}${p.name} ${WEAPONS[p.w]?.icon || ''}`, x + 16, y - 4);
        if (p.alive) {
          ctx.fillStyle = '#374151'; ctx.fillRect(x + 16, y + 6, 40, 4);
          ctx.fillStyle = '#22c55e'; ctx.fillRect(x + 16, y + 6, 40 * Math.max(0, p.hp) / 100, 4);
          if (p.sh > 0) { ctx.fillStyle = '#38bdf8'; ctx.fillRect(x + 16, y + 11, 40 * p.sh / 100, 3); }
        }
        ctx.globalAlpha = 1; ctx.textAlign = 'center';
      };
      for (const p of others.values()) drawP(p, false);
      drawP(me, true);

      if (now - lastHud > 150) {
        lastHud = now;
        const all = [me, ...others.values()];
        setHud({ hp: Math.max(0, Math.round(me.hp)), sh: Math.round(me.sh), w: me.w, alive: me.alive, players: all.length, aliveCount: all.filter((p) => p.alive).length, kills: me.kills, zone: Math.max(0, Math.ceil((MATCH_MS - (now - matchStart)) / 1000)), msg: now < msgUntil ? msg : '' });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize); window.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('mousemove', onMove); canvas.removeEventListener('mousedown', onDown);
      supabase.removeChannel(channel);
    };
  }, [username]);

  const w = WEAPONS[hud.w];
  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col select-none">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 text-white text-sm">
        <div className="font-bold">🖱️ Cursor Battlefront</div>
        <div className="flex gap-4 text-xs">
          <span>👥 {hud.aliveCount}/{hud.players} alive</span>
          <span>💀 {hud.kills} kills</span>
          <span>🌀 Storm: {hud.zone}s</span>
        </div>
        <button onClick={onClose} className="px-3 py-1 rounded bg-red-900/40 text-red-300 text-xs">✕ Leave</button>
      </div>
      <div className="relative flex-1">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-none" onContextMenu={(e) => e.preventDefault()} />
        {hud.msg && <div className="pointer-events-none absolute top-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-black/70 text-white font-bold text-lg">{hud.msg}</div>}
        <div className="pointer-events-none absolute top-4 right-4 space-y-1 text-xs text-white">
          {feed.map((f, i) => <div key={i} className="bg-black/60 px-2 py-1 rounded">{f}</div>)}
        </div>
        <div className="pointer-events-none absolute bottom-4 left-4 bg-black/70 rounded-xl p-3 text-white w-56">
          <div className="text-xs mb-1">❤️ {hud.hp}</div>
          <div className="h-2 bg-gray-700 rounded"><div className="h-2 bg-green-500 rounded" style={{ width: `${hud.hp}%` }} /></div>
          <div className="text-xs mt-2 mb-1">🛡️ {hud.sh}</div>
          <div className="h-2 bg-gray-700 rounded"><div className="h-2 bg-sky-400 rounded" style={{ width: `${hud.sh}%` }} /></div>
          <div className="mt-2 text-sm">{w.icon} {w.name} · {w.dmg * w.pellets} dmg</div>
        </div>
        <div className="pointer-events-none absolute bottom-4 right-4 bg-black/60 rounded-lg px-3 py-2 text-[11px] text-gray-300 max-w-xs">
          Move your mouse to move · Hold click to shoot the way you're moving · Grab 🔫💨💥🎯🚀 weapons, ❤️ heals, 🛡️ shields · Stay out of the purple storm
        </div>
        {!hud.alive && <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className="text-4xl font-black text-red-400">☠️ ELIMINATED — spectating</div></div>}
      </div>
    </div>
  );
}
