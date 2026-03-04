import { useState } from 'react';

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
}

const corners: Corner[] = [
  { id: 'bentley', name: "Bentley's Corner", emoji: '🤖', color: 'from-cyan-500 to-blue-600', description: 'All the latest AI tools & playgrounds' },
  { id: 'micah', name: "Micah's Corner", emoji: '🧩', color: 'from-emerald-500 to-teal-600', description: 'Platformers, puzzles, chess & brain games' },
  { id: 'jayson', name: "Jayson's Corner", emoji: '💀', color: 'from-red-600 to-gray-900', description: 'Horror, survival & brutally hard games' },
  { id: 'nathaniel', name: "Nathaniel's Corner", emoji: '🎤', color: 'from-pink-500 to-purple-600', description: 'Every Friday Night Funkin\' mod imaginable' },
];

const cornerItems: CornerItem[] = [
  // BENTLEY'S CORNER — AI
  { id: 'chatgpt', name: 'ChatGPT', icon: '💬', url: 'https://chat.openai.com/', description: 'OpenAI\'s conversational AI', color: 'from-green-500 to-teal-600', corner: 'bentley' },
  { id: 'gemini', name: 'Google Gemini', icon: '✨', url: 'https://gemini.google.com/', description: 'Google\'s multimodal AI', color: 'from-blue-500 to-indigo-600', corner: 'bentley' },
  { id: 'claude', name: 'Claude', icon: '🧠', url: 'https://claude.ai/', description: 'Anthropic\'s helpful AI assistant', color: 'from-amber-500 to-orange-600', corner: 'bentley' },
  { id: 'copilot', name: 'Microsoft Copilot', icon: '🪟', url: 'https://copilot.microsoft.com/', description: 'Microsoft\'s AI companion', color: 'from-blue-600 to-cyan-500', corner: 'bentley' },
  { id: 'perplexity', name: 'Perplexity', icon: '🔍', url: 'https://www.perplexity.ai/', description: 'AI-powered search engine', color: 'from-teal-500 to-cyan-600', corner: 'bentley' },
  { id: 'midjourney', name: 'Midjourney', icon: '🎨', url: 'https://www.midjourney.com/', description: 'AI image generation', color: 'from-indigo-600 to-purple-700', corner: 'bentley' },
  { id: 'dalle', name: 'DALL·E', icon: '🖼️', url: 'https://labs.openai.com/', description: 'OpenAI image generator', color: 'from-green-600 to-emerald-700', corner: 'bentley' },
  { id: 'suno', name: 'Suno AI', icon: '🎵', url: 'https://suno.com/', description: 'AI music generation', color: 'from-purple-500 to-pink-600', corner: 'bentley' },
  { id: 'elevenlabs', name: 'ElevenLabs', icon: '🗣️', url: 'https://elevenlabs.io/', description: 'AI voice & speech', color: 'from-gray-700 to-gray-900', corner: 'bentley' },
  { id: 'runway', name: 'Runway', icon: '🎬', url: 'https://runwayml.com/', description: 'AI video generation', color: 'from-violet-600 to-purple-800', corner: 'bentley' },
  { id: 'huggingface', name: 'Hugging Face', icon: '🤗', url: 'https://huggingface.co/', description: 'AI model hub & demos', color: 'from-yellow-500 to-amber-600', corner: 'bentley' },
  { id: 'poe', name: 'Poe', icon: '⚡', url: 'https://poe.com/', description: 'Multi-AI chatbot platform', color: 'from-blue-400 to-blue-600', corner: 'bentley' },
  { id: 'character-ai', name: 'Character.AI', icon: '👤', url: 'https://character.ai/', description: 'Chat with AI characters', color: 'from-purple-400 to-indigo-600', corner: 'bentley' },
  { id: 'stable-diffusion', name: 'Stable Diffusion', icon: '🎭', url: 'https://stablediffusionweb.com/', description: 'Open-source image AI', color: 'from-rose-500 to-pink-700', corner: 'bentley' },
  { id: 'gamma', name: 'Gamma', icon: '📊', url: 'https://gamma.app/', description: 'AI presentations & docs', color: 'from-indigo-500 to-blue-700', corner: 'bentley' },
  { id: 'notion-ai', name: 'Notion AI', icon: '📝', url: 'https://www.notion.so/', description: 'AI-powered workspace', color: 'from-gray-600 to-gray-800', corner: 'bentley' },

  // MICAH'S CORNER — Platformers, Puzzles, Chess
  { id: 'bigtower', name: 'Big Tower Tiny Square', icon: '🏗️', url: 'https://www.coolmathgames.com/0-big-tower-tiny-square', description: 'Climb the massive tower!', color: 'from-blue-500 to-indigo-600', corner: 'micah' },
  { id: 'bigtower2', name: 'Big Tower Tiny Square 2', icon: '🏗️', url: 'https://www.coolmathgames.com/0-big-tower-tiny-square-2', description: 'Even bigger tower!', color: 'from-purple-500 to-indigo-600', corner: 'micah' },
  { id: 'tombmask', name: 'Tomb of the Mask', icon: '💀', url: 'https://www.poki.com/en/g/tomb-of-the-mask', description: 'Arcade maze runner!', color: 'from-green-500 to-lime-600', corner: 'micah' },
  { id: 'micah-chess', name: 'Chess', icon: '♟️', url: 'https://www.chess.com/play/computer', description: 'Play chess vs computer', color: 'from-gray-600 to-gray-800', corner: 'micah' },
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
  { id: 'granny-j', name: 'Granny', icon: '👵', url: 'https://grannygame.io/', description: 'Escape the creepy house!', color: 'from-gray-700 to-gray-900', corner: 'jayson' },
  { id: 'granny2-j', name: 'Granny Chapter Two', icon: '👵', url: 'https://grannygame.io/granny-chapter-two/', description: 'Escape again with Grandpa!', color: 'from-gray-800 to-red-900', corner: 'jayson' },
  { id: 'granny3-j', name: 'Granny 3', icon: '👵', url: 'https://grannygame.io/granny-3/', description: 'The scariest escape yet!', color: 'from-red-900 to-gray-950', corner: 'jayson' },
  { id: 'mc-classic-j', name: 'Minecraft Classic', icon: '⛏️', url: 'https://classic.minecraft.net/', description: 'Official Minecraft Classic!', color: 'from-green-700 to-lime-600', corner: 'jayson' },
  { id: 'eaglercraft-j', name: 'Eaglercraft', icon: '🦅', url: 'https://eaglercraft.com/mc/1.8.8/', description: 'Minecraft 1.8 in browser!', color: 'from-emerald-600 to-green-700', corner: 'jayson' },
  { id: 'whg1', name: "World's Hardest Game", icon: '🟥', url: 'https://www.coolmathgames.com/0-worlds-hardest-game', description: 'Can you beat it?', color: 'from-red-600 to-red-800', corner: 'jayson' },
  { id: 'whg2', name: "World's Hardest Game 2", icon: '🟥', url: 'https://www.coolmathgames.com/0-worlds-hardest-game-2', description: 'Even harder!', color: 'from-red-700 to-red-900', corner: 'jayson' },
  { id: 'whg3', name: "World's Hardest Game 3", icon: '🟥', url: 'https://www.coolmathgames.com/0-worlds-hardest-game-3', description: 'The ultimate challenge!', color: 'from-red-800 to-gray-900', corner: 'jayson' },
  { id: 'fnaf-j', name: 'FNAF', icon: '🐻', url: 'https://fnaf-game.com/', description: "Five Nights at Freddy's!", color: 'from-gray-800 to-gray-950', corner: 'jayson' },
  { id: 'baldi-j', name: "Baldi's Basics", icon: '📏', url: 'https://baldisbasicsgame.com/', description: "Don't let Baldi catch you!", color: 'from-yellow-600 to-yellow-800', corner: 'jayson' },
  { id: 'happywheels-j', name: 'Happy Wheels', icon: '🛞', url: 'https://www.totaljerkface.com/happy_wheels.tjf', description: 'Ragdoll physics chaos!', color: 'from-red-600 to-orange-600', corner: 'jayson' },
  { id: 'impossiblequiz', name: 'The Impossible Quiz', icon: '❓', url: 'https://theimpossiblequiz.io/', description: 'Trick question madness!', color: 'from-blue-600 to-purple-700', corner: 'jayson' },
  { id: 'gettingoverit', name: 'Getting Over It', icon: '🏔️', url: 'https://www.poki.com/en/g/getting-over-it', description: 'Rage-inducing climbing!', color: 'from-amber-700 to-stone-800', corner: 'jayson' },

  // NATHANIEL'S CORNER — FNF Mods
  { id: 'fnf-base', name: 'Friday Night Funkin\'', icon: '🎤', url: 'https://fridaynightfunkin.me/', description: 'The original FNF!', color: 'from-cyan-500 to-blue-600', corner: 'nathaniel' },
  { id: 'fnf-tricky', name: 'FNF vs Tricky', icon: '🤡', url: 'https://fnf-mods.net/fnf-vs-tricky/', description: 'Face the clown from Madness!', color: 'from-green-600 to-green-800', corner: 'nathaniel' },
  { id: 'fnf-whitty', name: 'FNF vs Whitty', icon: '💣', url: 'https://fnf-mods.net/fnf-vs-whitty/', description: 'Bomb-headed rap battle!', color: 'from-orange-500 to-red-600', corner: 'nathaniel' },
  { id: 'fnf-garcello', name: 'FNF vs Garcello', icon: '🚬', url: 'https://fnf-mods.net/fnf-vs-garcello/', description: 'Smoke \'em out funk!', color: 'from-purple-600 to-purple-800', corner: 'nathaniel' },
  { id: 'fnf-hex', name: 'FNF vs Hex', icon: '🤖', url: 'https://fnf-mods.net/fnf-vs-hex/', description: 'Battle the basketball robot!', color: 'from-blue-500 to-blue-700', corner: 'nathaniel' },
  { id: 'fnf-sarvente', name: 'FNF Mid-Fight Masses', icon: '⛪', url: 'https://fnf-mods.net/fnf-mid-fight-masses/', description: 'Church rap battle!', color: 'from-pink-500 to-red-600', corner: 'nathaniel' },
  { id: 'fnf-bob', name: 'FNF vs Bob', icon: '😐', url: 'https://fnf-mods.net/fnf-vs-bob/', description: 'Don\'t underestimate Bob!', color: 'from-green-400 to-green-600', corner: 'nathaniel' },
  { id: 'fnf-tabi', name: 'FNF vs Tabi', icon: '💀', url: 'https://fnf-mods.net/fnf-vs-tabi/', description: 'Ex-boyfriend revenge!', color: 'from-gray-700 to-gray-900', corner: 'nathaniel' },
  { id: 'fnf-agoti', name: 'FNF vs AGOTI', icon: '🎹', url: 'https://fnf-mods.net/fnf-vs-agoti/', description: 'Void dimension rap battle!', color: 'from-indigo-600 to-indigo-800', corner: 'nathaniel' },
  { id: 'fnf-shaggy', name: 'FNF vs Shaggy', icon: '🟢', url: 'https://fnf-mods.net/fnf-vs-shaggy/', description: 'Ultra instinct Shaggy!', color: 'from-lime-500 to-green-700', corner: 'nathaniel' },
  { id: 'fnf-matt', name: 'FNF vs Matt', icon: '🥊', url: 'https://fnf-mods.net/fnf-vs-matt/', description: 'Wii Sports champion!', color: 'from-blue-400 to-blue-600', corner: 'nathaniel' },
  { id: 'fnf-sky', name: 'FNF vs Sky', icon: '☁️', url: 'https://fnf-mods.net/fnf-vs-sky/', description: 'Obsessed fangirl!', color: 'from-sky-400 to-blue-500', corner: 'nathaniel' },
  { id: 'fnf-zardy', name: 'FNF vs Zardy', icon: '🎃', url: 'https://fnf-mods.net/fnf-vs-zardy/', description: 'Scarecrow rap battle!', color: 'from-orange-600 to-amber-800', corner: 'nathaniel' },
  { id: 'fnf-kapi', name: 'FNF vs Kapi', icon: '🐱', url: 'https://fnf-mods.net/fnf-vs-kapi/', description: 'DDR dance battle!', color: 'from-yellow-400 to-amber-500', corner: 'nathaniel' },
  { id: 'fnf-hd', name: 'FNF HD', icon: '🖥️', url: 'https://fnf-mods.net/friday-night-funkin-hd/', description: 'HD remastered FNF!', color: 'from-cyan-600 to-blue-700', corner: 'nathaniel' },
  { id: 'fnf-sonic', name: 'FNF vs Sonic.EXE', icon: '🦔', url: 'https://fnf-mods.net/fnf-vs-sonic-exe/', description: 'Creepy Sonic rap battle!', color: 'from-blue-700 to-red-800', corner: 'nathaniel' },
  { id: 'fnf-huggy', name: 'FNF vs Huggy Wuggy', icon: '🧸', url: 'https://fnf-mods.net/fnf-vs-huggy-wuggy/', description: 'Poppy Playtime crossover!', color: 'from-blue-500 to-blue-800', corner: 'nathaniel' },
  { id: 'fnf-indie', name: 'FNF Indie Cross', icon: '🎮', url: 'https://fnf-mods.net/fnf-indie-cross/', description: 'Sans, Cuphead, Bendy!', color: 'from-purple-600 to-indigo-800', corner: 'nathaniel' },
  { id: 'fnf-bf', name: 'FNF B-Side', icon: '🔄', url: 'https://fnf-mods.net/fnf-b-side-remixes/', description: 'Remixed tracks!', color: 'from-red-500 to-pink-600', corner: 'nathaniel' },
  { id: 'fnf-minus', name: 'FNF Minus', icon: '➖', url: 'https://fnf-mods.net/friday-night-funkin-minus/', description: 'Icon redesigns!', color: 'from-teal-500 to-cyan-600', corner: 'nathaniel' },
  { id: 'fnf-corruption', name: 'FNF Corruption', icon: '🦠', url: 'https://fnf-mods.net/fnf-corruption/', description: 'The corruption spreads!', color: 'from-purple-800 to-gray-950', corner: 'nathaniel' },
  { id: 'fnf-selever', name: 'FNF vs Selever', icon: '😈', url: 'https://fnf-mods.net/fnf-vs-selever/', description: 'Demonic rap battle!', color: 'from-red-600 to-purple-700', corner: 'nathaniel' },
  { id: 'fnf-starecrown', name: 'FNF vs Starecrown', icon: '👁️', url: 'https://fnf-mods.net/fnf-vs-starecrown/', description: 'Creepy staring contest!', color: 'from-yellow-500 to-red-600', corner: 'nathaniel' },
  { id: 'fnf-carol', name: 'FNF vs Carol', icon: '🎸', url: 'https://fnf-mods.net/fnf-vs-carol/', description: 'Rock out with Carol!', color: 'from-pink-500 to-rose-600', corner: 'nathaniel' },
  { id: 'fnf-monika', name: 'FNF vs Monika', icon: '📖', url: 'https://fnf-mods.net/fnf-vs-monika/', description: 'DDLC crossover!', color: 'from-pink-400 to-pink-600', corner: 'nathaniel' },
  { id: 'fnf-anders', name: 'FNF vs Anders', icon: '🔵', url: 'https://fnf-mods.net/fnf-vs-anders/', description: 'Among Us impostor!', color: 'from-blue-500 to-purple-600', corner: 'nathaniel' },
  { id: 'fnf-lemon', name: 'FNF vs Lemon Demon', icon: '🍋', url: 'https://fnf-mods.net/fnf-vs-lemon-demon/', description: 'Monster takes the mic!', color: 'from-yellow-400 to-lime-500', corner: 'nathaniel' },
  { id: 'fnf-pibby', name: 'FNF Pibby Corrupted', icon: '📺', url: 'https://fnf-mods.net/fnf-pibby-corrupted/', description: 'Pibby apocalypse!', color: 'from-purple-700 to-black', corner: 'nathaniel' },
  { id: 'fnf-nonsense', name: 'FNF vs Nonsense', icon: '🤪', url: 'https://fnf-mods.net/fnf-vs-nonsense/', description: 'Pure chaos rap battle!', color: 'from-yellow-300 to-orange-400', corner: 'nathaniel' },
  { id: 'fnf-retrospecter', name: 'FNF vs Retrospecter', icon: '🐉', url: 'https://fnf-mods.net/fnf-vs-retrospecter/', description: 'Dragon demon battle!', color: 'from-red-600 to-orange-700', corner: 'nathaniel' },
];

interface AnythingButWorkProps {
  onBack: () => void;
}

export function AnythingButWork({ onBack }: AnythingButWorkProps) {
  const [activeCorner, setActiveCorner] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<CornerItem | null>(null);
  const [iframeError, setIframeError] = useState(false);

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
          <iframe src={activeItem.url} className="flex-1 w-full border-0"
            allow="fullscreen; autoplay; gamepad; accelerometer; gyroscope; microphone; camera"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals allow-popups-to-escape-sandbox"
            referrerPolicy="no-referrer" onError={() => setIframeError(true)} title={activeItem.name} />
        )}
      </div>
    );
  }

  const itemsForCorner = activeCorner ? cornerItems.filter(i => i.corner === activeCorner) : [];
  const currentCorner = corners.find(c => c.id === activeCorner);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={activeCorner ? () => setActiveCorner(null) : onBack}
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
              <p className="text-gray-500 text-sm">{currentCorner?.description}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
              {itemsForCorner.map(item => (
                <div key={item.id} onClick={() => { setActiveItem(item); setIframeError(false); }}
                  className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-600 hover:shadow-lg transition-all group cursor-pointer">
                  <div className={`h-20 bg-gradient-to-br ${item.color} flex items-center justify-center relative`}>
                    <span className="text-3xl group-hover:scale-110 transition-transform drop-shadow-lg">{item.icon}</span>
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
          </>
        )}
      </div>
    </div>
  );
}
