import { useState, useRef, useEffect } from 'react';
import { AIChatInterface } from './AIChatInterface';

interface Corner {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description: string;
}

interface CornerItem {
  id: string;
  name: string;
  icon: string;
  url: string;
  description: string;
  color: string;
  corner: string;
  openInNewTab?: boolean;
}

const corners: Corner[] = [
  { id: 'bentley', name: "Bentley's Corner", emoji: '🤖', color: 'from-cyan-500 to-blue-600', description: 'All the latest AI tools & playgrounds' },
  { id: 'micah', name: "Micah's Corner", emoji: '🧩', color: 'from-emerald-500 to-teal-600', description: 'Platformers, puzzles, chess & brain games' },
  { id: 'jayson', name: "Jayson's Corner", emoji: '💀', color: 'from-red-600 to-gray-900', description: 'Horror, survival & brutally hard games' },
  { id: 'nathaniel', name: "Nathaniel's Corner", emoji: '🎤', color: 'from-pink-500 to-purple-600', description: 'Every Friday Night Funkin\' mod imaginable' },
];

const FNF_BASE = 'https://intelleducation.netlify.app/gn-math';

const cornerItems: CornerItem[] = [
  // BENTLEY'S CORNER — AI
  { id: 'ai-chat', name: 'AI Chat (Built-in)', icon: '🤖', url: '', description: 'Chat with GPT-5, Gemini & more — right here!', color: 'from-emerald-500 to-cyan-600', corner: 'bentley' },
  { id: 'chatgpt', name: 'ChatGPT', icon: '💬', url: 'https://chat.openai.com/', description: 'OpenAI\'s conversational AI', color: 'from-green-500 to-teal-600', corner: 'bentley', openInNewTab: true },
  { id: 'gemini', name: 'Google Gemini', icon: '✨', url: 'https://gemini.google.com/', description: 'Google\'s multimodal AI', color: 'from-blue-500 to-indigo-600', corner: 'bentley', openInNewTab: true },
  { id: 'claude', name: 'Claude', icon: '🧠', url: 'https://claude.ai/', description: 'Anthropic\'s helpful AI assistant', color: 'from-amber-500 to-orange-600', corner: 'bentley', openInNewTab: true },
  { id: 'copilot', name: 'Microsoft Copilot', icon: '🪟', url: 'https://copilot.microsoft.com/', description: 'Microsoft\'s AI companion', color: 'from-blue-600 to-cyan-500', corner: 'bentley', openInNewTab: true },
  { id: 'perplexity', name: 'Perplexity', icon: '🔍', url: 'https://www.perplexity.ai/', description: 'AI-powered search engine', color: 'from-teal-500 to-cyan-600', corner: 'bentley', openInNewTab: true },
  { id: 'midjourney', name: 'Midjourney', icon: '🎨', url: 'https://www.midjourney.com/', description: 'AI image generation', color: 'from-indigo-600 to-purple-700', corner: 'bentley', openInNewTab: true },
  { id: 'dalle', name: 'DALL·E', icon: '🖼️', url: 'https://labs.openai.com/', description: 'OpenAI image generator', color: 'from-green-600 to-emerald-700', corner: 'bentley', openInNewTab: true },
  { id: 'suno', name: 'Suno AI', icon: '🎵', url: 'https://suno.com/', description: 'AI music generation', color: 'from-purple-500 to-pink-600', corner: 'bentley', openInNewTab: true },
  { id: 'elevenlabs', name: 'ElevenLabs', icon: '🗣️', url: 'https://elevenlabs.io/', description: 'AI voice & speech', color: 'from-gray-700 to-gray-900', corner: 'bentley', openInNewTab: true },
  { id: 'runway', name: 'Runway', icon: '🎬', url: 'https://runwayml.com/', description: 'AI video generation', color: 'from-violet-600 to-purple-800', corner: 'bentley', openInNewTab: true },
  { id: 'huggingface', name: 'Hugging Face', icon: '🤗', url: 'https://huggingface.co/', description: 'AI model hub & demos', color: 'from-yellow-500 to-amber-600', corner: 'bentley', openInNewTab: true },
  { id: 'poe', name: 'Poe', icon: '⚡', url: 'https://poe.com/', description: 'Multi-AI chatbot platform', color: 'from-blue-400 to-blue-600', corner: 'bentley', openInNewTab: true },
  { id: 'character-ai', name: 'Character.AI', icon: '👤', url: 'https://character.ai/', description: 'Chat with AI characters', color: 'from-purple-400 to-indigo-600', corner: 'bentley', openInNewTab: true },
  { id: 'stable-diffusion', name: 'Stable Diffusion', icon: '🎭', url: 'https://stablediffusionweb.com/', description: 'Open-source image AI', color: 'from-rose-500 to-pink-700', corner: 'bentley', openInNewTab: true },
  { id: 'gamma', name: 'Gamma', icon: '📊', url: 'https://gamma.app/', description: 'AI presentations & docs', color: 'from-indigo-500 to-blue-700', corner: 'bentley', openInNewTab: true },
  { id: 'notion-ai', name: 'Notion AI', icon: '📝', url: 'https://www.notion.so/', description: 'AI-powered workspace', color: 'from-gray-600 to-gray-800', corner: 'bentley', openInNewTab: true },

  // MICAH'S CORNER — Platformers, Puzzles, Chess
  { id: 'bigtower', name: 'Big Tower Tiny Square', icon: '🏗️', url: 'https://www.coolmathgames.com/0-big-tower-tiny-square', description: 'Climb the massive tower!', color: 'from-blue-500 to-indigo-600', corner: 'micah' },
  { id: 'bigtower2', name: 'Big Tower Tiny Square 2', icon: '🏗️', url: 'https://www.coolmathgames.com/0-big-tower-tiny-square-2', description: 'Even bigger tower!', color: 'from-purple-500 to-indigo-600', corner: 'micah' },
  { id: 'tombmask', name: 'Tomb of the Mask', icon: '💀', url: 'https://www.poki.com/en/g/tomb-of-the-mask', description: 'Arcade maze runner!', color: 'from-green-500 to-lime-600', corner: 'micah' },
  { id: 'micah-chess', name: 'Chess', icon: '♟️', url: 'https://www.chess.com/play/computer', description: 'Play chess vs computer', color: 'from-gray-600 to-gray-800', corner: 'micah', openInNewTab: true },
  { id: 'vex3m', name: 'Vex 3', icon: '🏃', url: 'https://vex3.io/', description: 'Hardcore platformer!', color: 'from-teal-600 to-teal-800', corner: 'micah' },
  { id: 'vex4m', name: 'Vex 4', icon: '🏃', url: 'https://vex4.io/', description: 'Even harder obstacles!', color: 'from-cyan-600 to-cyan-800', corner: 'micah' },
  { id: 'vex5m', name: 'Vex 5', icon: '🏃', url: 'https://vex5.io/', description: 'Ultimate challenge!', color: 'from-blue-600 to-blue-800', corner: 'micah' },
  { id: 'geometrydashm', name: 'Geometry Dash', icon: '🔷', url: 'https://geometrydash.io/', description: 'Jump to the beat!', color: 'from-blue-600 to-indigo-700', corner: 'micah' },
  { id: '2048m', name: '2048', icon: '🔢', url: 'https://play2048.co/', description: 'Merge tiles to 2048', color: 'from-orange-400 to-amber-500', corner: 'micah' },
  { id: 'sudokum', name: 'Sudoku', icon: '🔢', url: 'https://sudoku.com/', description: 'Classic number puzzle', color: 'from-blue-400 to-blue-600', corner: 'micah' },
  { id: 'checkersm', name: 'Checkers', icon: '🔴', url: 'https://checkers.online/', description: 'Classic checkers!', color: 'from-red-600 to-red-800', corner: 'micah' },
  { id: 'minesweeperm', name: 'Minesweeper', icon: '💣', url: 'https://minesweeper.io/', description: 'Avoid the mines!', color: 'from-gray-500 to-gray-700', corner: 'micah' },
  { id: 'jigsawm', name: 'Jigsaw Puzzles', icon: '🧩', url: 'https://www.jigsawplanet.com/', description: 'Online jigsaw puzzles', color: 'from-teal-500 to-cyan-600', corner: 'micah' },
  { id: 'raftwarss', name: 'Raft Wars', icon: '🚣', url: 'https://www.coolmathgames.com/0-raft-wars', description: 'Launch projectiles from your raft!', color: 'from-blue-400 to-cyan-500', corner: 'micah' },
  { id: 'raftwars2', name: 'Raft Wars 2', icon: '🚣', url: 'https://www.coolmathgames.com/0-raft-wars-2', description: 'More raft battles!', color: 'from-cyan-500 to-blue-600', corner: 'micah' },
  { id: 'fireboymc', name: 'Fireboy & Watergirl', icon: '🔥', url: 'https://www.coolmathgames.com/0-fireboy-and-water-girl-in-the-forest-temple', description: 'Co-op temple adventure!', color: 'from-orange-500 to-blue-500', corner: 'micah' },
  { id: 'doodlejumpm', name: 'Doodle Jump', icon: '📝', url: 'https://doodlejump.io/', description: 'Jump as high as you can!', color: 'from-lime-400 to-green-500', corner: 'micah' },
  { id: 'cutrope', name: 'Cut the Rope', icon: '🍬', url: 'https://www.coolmathgames.com/0-cut-the-rope', description: 'Feed Om Nom candy!', color: 'from-green-400 to-emerald-500', corner: 'micah' },
  { id: 'wheely', name: 'Wheely', icon: '🚗', url: 'https://www.coolmathgames.com/0-wheely', description: 'Puzzle car adventure!', color: 'from-red-400 to-orange-500', corner: 'micah' },
  { id: 'snailbob', name: 'Snail Bob', icon: '🐌', url: 'https://www.coolmathgames.com/0-snail-bob', description: 'Guide the snail home!', color: 'from-green-500 to-lime-600', corner: 'micah' },

  // JAYSON'S CORNER — Horror, Hard Games
  { id: 'granny-j', name: 'Granny', icon: '👵', url: 'https://www.crazygames.com/game/granny', description: 'Escape the creepy house!', color: 'from-gray-700 to-gray-900', corner: 'jayson' },
  { id: 'granny2-j', name: 'Granny Chapter Two', icon: '👵', url: 'https://www.crazygames.com/game/granny-chapter-two', description: 'Escape again with Grandpa!', color: 'from-gray-800 to-red-900', corner: 'jayson' },
  { id: 'mc-classic-j', name: 'Minecraft Classic', icon: '⛏️', url: 'https://classic.minecraft.net/', description: 'Official Minecraft Classic!', color: 'from-green-700 to-lime-600', corner: 'jayson', openInNewTab: true },
  { id: 'eaglercraft-j', name: 'Eaglercraft', icon: '🦅', url: 'https://eaglercraft.com/mc/1.8.8/', description: 'Minecraft 1.8 in browser!', color: 'from-emerald-600 to-green-700', corner: 'jayson' },
  { id: 'whg1', name: "World's Hardest Game", icon: '🟥', url: 'https://www.coolmathgames.com/0-worlds-hardest-game', description: 'Can you beat it?', color: 'from-red-600 to-red-800', corner: 'jayson' },
  { id: 'whg2', name: "World's Hardest Game 2", icon: '🟥', url: 'https://www.coolmathgames.com/0-worlds-hardest-game-2', description: 'Even harder!', color: 'from-red-700 to-red-900', corner: 'jayson' },
  { id: 'whg3', name: "World's Hardest Game 3", icon: '🟥', url: 'https://www.coolmathgames.com/0-worlds-hardest-game-3', description: 'The ultimate challenge!', color: 'from-red-800 to-gray-900', corner: 'jayson' },
  { id: 'fnaf-j', name: 'FNAF', icon: '🐻', url: 'https://www.crazygames.com/game/five-nights-at-freddys', description: "Five Nights at Freddy's!", color: 'from-gray-800 to-gray-950', corner: 'jayson' },
  { id: 'baldi-j', name: "Baldi's Basics", icon: '📏', url: 'https://www.crazygames.com/game/baldis-basics', description: "Don't let Baldi catch you!", color: 'from-yellow-600 to-yellow-800', corner: 'jayson' },
  { id: 'happywheels-j', name: 'Happy Wheels', icon: '🛞', url: 'https://www.crazygames.com/game/happy-wheels', description: 'Ragdoll physics chaos!', color: 'from-red-600 to-orange-600', corner: 'jayson' },
  { id: 'impossiblequiz', name: 'The Impossible Quiz', icon: '❓', url: 'https://theimpossiblequiz.io/', description: 'Trick question madness!', color: 'from-blue-600 to-purple-700', corner: 'jayson' },
  { id: 'gettingoverit', name: 'Getting Over It', icon: '🏔️', url: 'https://www.poki.com/en/g/getting-over-it', description: 'Rage-inducing climbing!', color: 'from-amber-700 to-stone-800', corner: 'jayson' },

  // NATHANIEL'S CORNER — FNF Mods (embedded via intelleducation.netlify.app)
  { id: 'fnf-bob-v2', name: 'FNF vs Bob V2', icon: '😐', url: `${FNF_BASE}/fnf-vs-bob-v2/index.html`, description: 'Bob is mad again!', color: 'from-green-500 to-green-700', corner: 'nathaniel' },
  { id: 'fnf-pibby', name: 'FNF vs Pibby Corrupted', icon: '📺', url: `${FNF_BASE}/fnf-vs-pibby-corrupted/index.html`, description: 'Pibby apocalypse!', color: 'from-purple-700 to-gray-900', corner: 'nathaniel' },
  { id: 'fnf-hypno', name: "FNF Hypno's Lullaby V2", icon: '😴', url: `${FNF_BASE}/fnf-vs-hypnos-lullaby-v2/index.html`, description: 'Creepy Pokémon mod!', color: 'from-yellow-600 to-purple-800', corner: 'nathaniel' },
  { id: 'fnf-sonic', name: 'FNF vs Sonic.EXE', icon: '🦔', url: `${FNF_BASE}/fnf-vs-sonic-exe/index.html`, description: 'Creepy Sonic rap battle!', color: 'from-blue-700 to-red-800', corner: 'nathaniel' },
  { id: 'fnf-carol', name: 'FNF vs Carol V2', icon: '🎸', url: `${FNF_BASE}/friday-night-funkin-vs-carol-v2/index.html`, description: 'Rock out with Carol!', color: 'from-pink-500 to-red-600', corner: 'nathaniel' },
  { id: 'fnf-impostor', name: 'FNF vs Impostor V4', icon: '📮', url: `${FNF_BASE}/friday-night-funkin-vs-impostor-v4/index.html`, description: 'Among Us crossover!', color: 'from-red-500 to-red-700', corner: 'nathaniel' },
  { id: 'fnf-nonsense', name: 'FNF vs Nonsense', icon: '🤪', url: `${FNF_BASE}/friday-night-funkin-vs-nonsense/index.html`, description: 'Pure chaos rap battle!', color: 'from-yellow-300 to-orange-400', corner: 'nathaniel' },
  { id: 'fnf-sunday', name: 'FNF vs Sunday Remastered', icon: '☀️', url: `${FNF_BASE}/friday-night-funkin-vs-sunday-remastered-hd/index.html`, description: 'Sunday HD remaster!', color: 'from-orange-400 to-yellow-500', corner: 'nathaniel' },
  { id: 'fnf-tabi', name: 'FNF vs Tabi', icon: '💀', url: `${FNF_BASE}/friday-night-funkin-vs-tabi/index.html`, description: 'Ex-boyfriend revenge!', color: 'from-gray-700 to-gray-900', corner: 'nathaniel' },
  { id: 'fnf-zardy', name: 'FNF vs Zardy', icon: '🌽', url: `${FNF_BASE}/friday-night-funkin-vs-zardy/index.html`, description: 'Scarecrow showdown!', color: 'from-amber-700 to-green-900', corner: 'nathaniel' },
  { id: 'fnf-dave', name: 'FNF vs Dave & Bambi V3', icon: '🌾', url: `${FNF_BASE}/friday-night-funkin-vs-dave-and-bambi-v3/index.html`, description: 'Dave & Bambi chaos!', color: 'from-green-500 to-lime-600', corner: 'nathaniel' },
  { id: 'fnf-dsides', name: 'FNF D-Sides', icon: '🔄', url: `${FNF_BASE}/friday-night-funkin-d-sides/index.html`, description: 'Alternate universe remix!', color: 'from-indigo-600 to-purple-700', corner: 'nathaniel' },
  { id: 'fnf-droproll', name: 'FNF Drop and Roll', icon: '🎲', url: `${FNF_BASE}/friday-night-funkin-drop-and-roll/index.html`, description: 'Drop & roll to the beat!', color: 'from-cyan-500 to-blue-600', corner: 'nathaniel' },
  { id: 'fnf-suicide', name: 'FNF Sunday Night Suicide', icon: '🐭', url: `${FNF_BASE}/friday-night-funkin-sunday-night-suicide/index.html`, description: 'Creepypasta Mickey!', color: 'from-gray-600 to-gray-900', corner: 'nathaniel' },
  { id: 'fnf-bsides', name: 'FNF vs Impostor B-Sides', icon: '📮', url: `${FNF_BASE}/friday-night-funkin-vs-impostor-b-sides/index.html`, description: 'B-Side impostor remix!', color: 'from-red-600 to-purple-700', corner: 'nathaniel' },
  { id: 'fnf-infidelity', name: "FNF Wednesday's Infidelity", icon: '📅', url: `${FNF_BASE}/friday-night-funkin-wednesdays-infidelity/index.html`, description: 'Creepy Wednesday mod!', color: 'from-gray-800 to-red-900', corner: 'nathaniel' },
  { id: 'fnf-akage', name: 'FNF Akage', icon: '🔥', url: `${FNF_BASE}/friday-night-funkin-akage/index.html`, description: 'Red-hot rhythm battle!', color: 'from-red-500 to-orange-600', corner: 'nathaniel' },
  { id: 'fnf-chaos', name: 'FNF Chaos Nightmare', icon: '🌀', url: `${FNF_BASE}/friday-night-funkin-chaos-nightmare/index.html`, description: 'Nightmare fuel!', color: 'from-purple-800 to-gray-950', corner: 'nathaniel' },
  { id: 'fnf-gumballs', name: 'FNF Gumballs', icon: '🔵', url: `${FNF_BASE}/friday-night-funkin-gumballs/index.html`, description: 'Gumball machine madness!', color: 'from-blue-400 to-pink-500', corner: 'nathaniel' },
  { id: 'fnf-heartbreak', name: 'FNF Heartbreak Havoc', icon: '💔', url: `${FNF_BASE}/friday-night-funkin-heartbreak-havoc/index.html`, description: 'Heartbreak rap battle!', color: 'from-rose-500 to-red-700', corner: 'nathaniel' },
  { id: 'fnf-rev', name: 'FNF Rev Mixed', icon: '🔀', url: `${FNF_BASE}/friday-night-funkin-rev-mixed/index.html`, description: 'Remixed and revved up!', color: 'from-teal-500 to-cyan-600', corner: 'nathaniel' },
  { id: 'fnf-impostor-alt', name: 'FNF vs Impostor Alternated', icon: '📮', url: `${FNF_BASE}/friday-night-funkin-vs-impostor-alternated/index.html`, description: 'Alternate impostor mod!', color: 'from-red-700 to-gray-800', corner: 'nathaniel' },
  { id: 'fnf-rewrite', name: 'VS Rewrite Round 2', icon: '✏️', url: `${FNF_BASE}/vs-rewrite-round-2/index.html`, description: 'Rewritten and remixed!', color: 'from-violet-500 to-indigo-700', corner: 'nathaniel' },
  { id: 'fernis-best', name: 'Fernis Best', icon: '🎮', url: 'https://s3.amazonaws.com/fernisbest/index.html', description: 'Classic fun game!', color: 'from-emerald-500 to-teal-700', corner: 'nathaniel' },
];

interface AnythingButWorkProps {
  onBack: () => void;
}

export function AnythingButWork({ onBack }: AnythingButWorkProps) {
  const [activeCorner, setActiveCorner] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<CornerItem | null>(null);
  const [iframeError, setIframeError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAIChat, setShowAIChat] = useState(false);

  const handleItemClick = (item: CornerItem) => {
    if (item.id === 'ai-chat') {
      setShowAIChat(true);
      return;
    }
    if (item.openInNewTab) {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    } else {
      setActiveItem(item);
      setIframeError(false);
    }
  };

  if (showAIChat) {
    return <AIChatInterface onBack={() => setShowAIChat(false)} />;
  }

  if (activeItem) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <div className="bg-gray-900 px-3 py-2 flex items-center justify-between border-b border-gray-800 shrink-0 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => { setActiveItem(null); setIframeError(false); }}
              className="px-3 py-1.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium shrink-0">← Back</button>
            <span className="text-xl shrink-0">{activeItem.icon}</span>
            <span className="text-white font-semibold hidden sm:inline truncate">{activeItem.name}</span>
          </div>
          <a href={activeItem.url} target="_blank" rel="noopener noreferrer"
            className="px-3 py-1.5 bg-blue-700 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs font-bold">↗ New Tab</a>
        </div>
        {iframeError ? (
          <div className="flex-1 flex items-center justify-center bg-gray-950">
            <div className="text-center p-8 max-w-md">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-bold text-white mb-2">Blocked in Frame</h3>
              <p className="text-gray-400 mb-6 text-sm">Open it in a new tab instead.</p>
              <a href={activeItem.url} target="_blank" rel="noopener noreferrer"
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors text-lg inline-block">Open in New Tab ↗</a>
            </div>
          </div>
        ) : (
          <iframe
            src={activeItem.url}
            className="flex-1 w-full"
            style={{ border: 'none', width: '100%', height: '100%' }}
            allow="autoplay; keyboard-focus; fullscreen"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals allow-popups-to-escape-sandbox"
            referrerPolicy="no-referrer"
            onError={() => setIframeError(true)}
            title={activeItem.name}
          />
        )}
      </div>
    );
  }

  const itemsForCorner = activeCorner ? cornerItems.filter(i => i.corner === activeCorner) : [];
  const currentCorner = corners.find(c => c.id === activeCorner);

  const filteredItems = searchQuery
    ? itemsForCorner.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : itemsForCorner;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={activeCorner ? () => { setActiveCorner(null); setSearchQuery(''); } : onBack}
              className="px-3 py-1.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium">← Back</button>
            <div>
              <h1 className="text-base font-bold">🚫📚 The Anything But Work</h1>
              <p className="text-xs text-gray-500">{activeCorner ? currentCorner?.name : 'Pick a corner!'}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {!activeCorner ? (
          <>
            <h2 className="text-3xl font-extrabold text-center mb-2">🚫📚 The Anything But Work</h2>
            <p className="text-gray-500 text-center mb-10 text-sm">Choose your corner</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {corners.map(c => (
                <button key={c.id} onClick={() => setActiveCorner(c.id)}
                  className={`bg-gradient-to-br ${c.color} rounded-2xl p-8 text-left hover:scale-[1.03] hover:shadow-2xl transition-all group`}>
                  <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">{c.emoji}</div>
                  <h3 className="text-2xl font-bold text-white mb-1">{c.name}</h3>
                  <p className="text-white/70 text-sm">{c.description}</p>
                  <p className="text-white/50 text-xs mt-3">{cornerItems.filter(i => i.corner === c.id).length} items →</p>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <span className="text-3xl">{currentCorner?.emoji}</span> {currentCorner?.name}
              </h2>
              <p className="text-gray-500 text-sm mb-4">{currentCorner?.description}</p>
              <input
                type="text"
                placeholder="🔍 Search mods..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full max-w-md px-4 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
            {filteredItems.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <div className="text-4xl mb-2">🔍</div>
                <p>No results for "{searchQuery}"</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
                {filteredItems.map(item => (
                  <div key={item.id} onClick={() => handleItemClick(item)}
                    className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-600 hover:shadow-lg transition-all group cursor-pointer">
                    <div className={`h-20 bg-gradient-to-br ${item.color} flex items-center justify-center relative`}>
                      <span className="text-3xl group-hover:scale-110 transition-transform drop-shadow-lg">{item.icon}</span>
                      {item.openInNewTab && (
                        <span className="absolute top-1 right-1 bg-black/40 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">↗ TAB</span>
                      )}
                      <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                        className="absolute top-1 left-1 w-6 h-6 bg-black/30 rounded-full flex items-center justify-center hover:bg-blue-600/80 transition-colors text-[10px] font-bold text-white">↗</a>
                    </div>
                    <div className="p-2">
                      <h3 className="font-bold text-white text-xs mb-0.5 leading-tight line-clamp-1">{item.name}</h3>
                      <p className="text-[10px] text-gray-500 leading-tight line-clamp-2">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
