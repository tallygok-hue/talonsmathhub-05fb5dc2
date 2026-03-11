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
  thumbnail?: string;
}

// Helper to create gn-math game URL via our loader
const gn = (id: number | string) => `/games/loader.html?id=${id}`;
// Cover image from gn-math CDN
const cover = (id: number | string, ext = 'png') => `https://cdn.jsdelivr.net/gh/gn-math/covers@main/${id}.${ext}`;

const corners: Corner[] = [
  { id: 'bentley', name: "Bentley's Corner", emoji: '🤖', color: 'from-cyan-500 to-blue-600', description: 'All the latest AI tools & playgrounds' },
  { id: 'games', name: "Games Hub", emoji: '🎮', color: 'from-orange-500 to-red-600', description: '700+ games from gn-math — shooters, horror, platformers & more' },
  { id: 'micah', name: "Micah's Corner", emoji: '🧩', color: 'from-emerald-500 to-teal-600', description: 'Platformers, puzzles, chess & brain games' },
  { id: 'jayson', name: "Jayson's Corner", emoji: '💀', color: 'from-red-600 to-gray-900', description: 'Horror, survival & brutally hard games' },
  { id: 'nathaniel', name: "Nathaniel's Corner", emoji: '🎤', color: 'from-pink-500 to-purple-600', description: 'Every Friday Night Funkin\' mod imaginable' },
];

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

  // ══════════════════════════════════════════════════
  // GAMES HUB — Popular games from gn-math.dev (700+)
  // ══════════════════════════════════════════════════

  // --- Featured / AAA ---
  { id: 'gn-cuphead', name: 'Cuphead', icon: '☕', url: gn(465), description: 'Run & gun boss battles!', color: 'from-red-500 to-yellow-600', corner: 'games', thumbnail: cover(465) },
  { id: 'gn-hollow-knight', name: 'Hollow Knight', icon: '🪲', url: gn(468), description: 'Metroidvania masterpiece!', color: 'from-indigo-800 to-gray-900', corner: 'games', thumbnail: cover(468) },
  { id: 'gn-celeste', name: 'Celeste', icon: '⛰️', url: gn(623), description: 'Climb the mountain!', color: 'from-blue-400 to-pink-500', corner: 'games', thumbnail: cover(623) },
  { id: 'gn-pizza-tower', name: 'Pizza Tower', icon: '🍕', url: gn(267), description: 'Wario-inspired chaos!', color: 'from-yellow-500 to-red-600', corner: 'games', thumbnail: cover(267) },
  { id: 'gn-terraria', name: 'Terraria', icon: '⛏️', url: gn(669), description: '2D sandbox adventure!', color: 'from-green-600 to-brown-700', corner: 'games', thumbnail: cover(669) },
  { id: 'gn-minecraft', name: 'Minecraft 1.12.2', icon: '🧱', url: gn(182), description: 'Full Minecraft in browser!', color: 'from-green-700 to-emerald-800', corner: 'games', thumbnail: cover(182) },
  { id: 'gn-ultrakill', name: 'ULTRAKILL', icon: '🔫', url: gn(196), description: 'Blood-fueled FPS!', color: 'from-red-700 to-red-900', corner: 'games', thumbnail: cover(196) },
  { id: 'gn-half-life', name: 'Half Life', icon: '🔬', url: gn(262), description: 'The classic FPS!', color: 'from-orange-600 to-amber-800', corner: 'games', thumbnail: cover(262) },
  { id: 'gn-doom', name: 'DOOM', icon: '👹', url: gn(203), description: 'Rip and tear!', color: 'from-red-800 to-gray-900', corner: 'games', thumbnail: cover(203) },
  { id: 'gn-doom2', name: 'Doom 2', icon: '👹', url: gn(602), description: 'Hell on Earth!', color: 'from-red-700 to-red-900', corner: 'games', thumbnail: cover(602) },
  { id: 'gn-doom3', name: 'Doom 3', icon: '👹', url: gn(626), description: 'Mars horror!', color: 'from-gray-800 to-red-900', corner: 'games', thumbnail: cover(626) },
  { id: 'gn-karlson', name: 'Karlson', icon: '🥛', url: gn(542), description: 'Dani\'s FPS parkour!', color: 'from-blue-500 to-cyan-600', corner: 'games', thumbnail: cover(542) },
  { id: 'gn-people-pg', name: 'People Playground', icon: '🧪', url: gn('194-m'), description: 'Physics sandbox!', color: 'from-gray-600 to-gray-800', corner: 'games', thumbnail: cover('194-m') },
  { id: 'gn-slime-rancher', name: 'Slime Rancher', icon: '🟢', url: gn(591), description: 'Farm cute slimes!', color: 'from-pink-400 to-blue-500', corner: 'games', thumbnail: cover(591) },
  { id: 'gn-webfishing', name: 'WebFishing', icon: '🎣', url: gn(423), description: 'Multiplayer fishing!', color: 'from-blue-400 to-teal-500', corner: 'games', thumbnail: cover(423) },
  { id: 'gn-stick-war', name: 'Stick War: Legacy', icon: '⚔️', url: gn(666), description: 'Stick figure strategy!', color: 'from-gray-700 to-gray-900', corner: 'games', thumbnail: cover(666) },
  { id: 'gn-repo', name: 'R.E.P.O', icon: '👻', url: gn(195), description: 'Co-op horror extraction!', color: 'from-green-800 to-gray-900', corner: 'games', thumbnail: cover(195) },

  // --- Horror ---
  { id: 'gn-bendy', name: 'Bendy & the Ink Machine', icon: '🖋️', url: gn(215), description: 'Cartoon horror!', color: 'from-yellow-600 to-gray-900', corner: 'games', thumbnail: cover(215) },
  { id: 'gn-fnaf-pizza', name: 'FNAF: Pizza Simulator', icon: '🍕', url: gn(191), description: 'Freddy Fazbear\'s Pizzeria!', color: 'from-red-800 to-gray-900', corner: 'games', thumbnail: cover(191) },
  { id: 'gn-fnaf-sl', name: 'FNAF: Sister Location', icon: '🤡', url: gn(185), description: 'Circus Baby\'s horror!', color: 'from-purple-800 to-gray-900', corner: 'games', thumbnail: cover(185) },
  { id: 'gn-iron-lung', name: 'Iron Lung', icon: '🫁', url: gn(705), description: 'Submarine horror!', color: 'from-red-900 to-gray-950', corner: 'games', thumbnail: cover(705) },
  { id: 'gn-tattletail', name: 'Tattletail', icon: '🧸', url: gn(607), description: 'Creepy toy horror!', color: 'from-purple-700 to-gray-900', corner: 'games', thumbnail: cover(607) },
  { id: 'gn-bad-parenting', name: 'Bad Parenting 1', icon: '🏚️', url: gn(166), description: 'Psychological horror!', color: 'from-gray-800 to-gray-950', corner: 'games', thumbnail: cover(166) },
  { id: 'gn-buckshot', name: 'Buckshot Roulette', icon: '🔫', url: gn(205), description: 'Russian roulette horror!', color: 'from-amber-800 to-gray-900', corner: 'games', thumbnail: cover(205) },
  { id: 'gn-not-neighbor', name: "That's Not My Neighbor", icon: '🚪', url: gn(216), description: 'Doppelganger detection!', color: 'from-green-800 to-gray-900', corner: 'games', thumbnail: cover(216) },
  { id: 'gn-kindergarten', name: 'Kindergarten', icon: '🎒', url: gn(445), description: 'Dark school sim!', color: 'from-yellow-500 to-red-600', corner: 'games', thumbnail: cover(445) },
  { id: 'gn-omori', name: 'OMORI', icon: '🖤', url: gn(427), description: 'Surreal horror RPG!', color: 'from-white to-gray-300', corner: 'games', thumbnail: cover(427) },
  { id: 'gn-yume-nikki', name: 'Yume Nikki', icon: '💤', url: gn(433), description: 'Surreal dream exploration!', color: 'from-purple-900 to-indigo-950', corner: 'games', thumbnail: cover(433) },
  { id: 'gn-amanda', name: 'Amanda the Adventurer', icon: '📺', url: gn(450), description: 'Creepy VHS tapes!', color: 'from-orange-600 to-red-800', corner: 'games', thumbnail: cover(450) },
  { id: 'gn-dead-plate', name: 'DEAD PLATE', icon: '🍽️', url: gn(462), description: 'Cooking horror!', color: 'from-red-700 to-gray-900', corner: 'games', thumbnail: cover(462) },
  { id: 'gn-backrooms', name: 'Backrooms', icon: '🚪', url: gn(64), description: 'Liminal space horror!', color: 'from-yellow-700 to-yellow-900', corner: 'games', thumbnail: cover(64) },
  { id: 'gn-andys-apple', name: "Andy's Apple Farm", icon: '🍎', url: gn(426), description: 'Cute but creepy!', color: 'from-red-500 to-green-600', corner: 'games', thumbnail: cover(426) },
  { id: 'gn-bite-freddy', name: "A Bite at Freddy's", icon: '🐻', url: gn(258), description: 'FNAF fangame!', color: 'from-purple-800 to-gray-900', corner: 'games', thumbnail: cover(258) },
  { id: 'gn-arthurs-nightmare', name: "Arthur's Nightmare", icon: '👓', url: gn(645), description: 'Arthur horror game!', color: 'from-yellow-600 to-red-800', corner: 'games', thumbnail: cover(645) },

  // --- Action / Shooters ---
  { id: 'gn-1v1lol', name: '1v1.LoL', icon: '🔫', url: gn(58), description: 'Build & shoot!', color: 'from-blue-600 to-purple-700', corner: 'games', thumbnail: cover(58) },
  { id: 'gn-cluster-rush', name: 'Cluster Rush', icon: '🚛', url: gn(81), description: 'Jump on trucks!', color: 'from-orange-500 to-red-600', corner: 'games', thumbnail: cover(81) },
  { id: 'gn-blockpost', name: 'BlockPost', icon: '🔫', url: gn(273), description: 'Block-based FPS!', color: 'from-green-600 to-blue-700', corner: 'games', thumbnail: cover(273) },
  { id: 'gn-buildnow', name: 'BuildNow.gg', icon: '🏗️', url: gn(581), description: 'Fortnite-style builder!', color: 'from-blue-500 to-purple-600', corner: 'games', thumbnail: cover(581) },
  { id: 'gn-death-run', name: 'Death Run 3D', icon: '💀', url: gn(211), description: 'Dodge obstacles!', color: 'from-red-600 to-gray-800', corner: 'games', thumbnail: cover(211) },
  { id: 'gn-alien-hominid', name: 'Alien Hominid', icon: '👽', url: gn(304), description: 'Classic Newgrounds shooter!', color: 'from-yellow-400 to-green-500', corner: 'games', thumbnail: cover(304) },
  { id: 'gn-bacon', name: 'Bacon May Die', icon: '🥓', url: gn(268), description: 'Beat em up action!', color: 'from-red-500 to-pink-600', corner: 'games', thumbnail: cover(268) },

  // --- Platformers ---
  { id: 'gn-big-tower', name: 'Big Tower Tiny Square', icon: '🏗️', url: gn(67), description: 'Climb the tower!', color: 'from-blue-500 to-indigo-600', corner: 'games', thumbnail: cover(67) },
  { id: 'gn-big-tower2', name: 'Big Tower Tiny Square 2', icon: '🏗️', url: gn(170), description: 'Even bigger!', color: 'from-purple-500 to-indigo-600', corner: 'games', thumbnail: cover(170) },
  { id: 'gn-big-neon', name: 'Big NEON Tower', icon: '💜', url: gn(68), description: 'Neon tower climb!', color: 'from-purple-500 to-pink-600', corner: 'games', thumbnail: cover(68) },
  { id: 'gn-big-ice', name: 'Big ICE Tower', icon: '🧊', url: gn(69), description: 'Icy tower climb!', color: 'from-cyan-400 to-blue-600', corner: 'games', thumbnail: cover(69) },
  { id: 'gn-dreadhead', name: 'Dreadhead Parkour', icon: '🏃', url: gn(310), description: 'Parkour action!', color: 'from-orange-500 to-red-600', corner: 'games', thumbnail: cover(310) },
  { id: 'gn-cave-story', name: 'Cave Story', icon: '🦇', url: gn(632), description: 'Classic indie platformer!', color: 'from-blue-700 to-gray-800', corner: 'games', thumbnail: cover(632) },
  { id: 'gn-celeste-pico', name: 'Celeste PICO', icon: '⛰️', url: gn(440), description: 'PICO-8 version!', color: 'from-blue-300 to-pink-400', corner: 'games', thumbnail: cover(440) },
  { id: 'gn-dadish', name: 'Dadish', icon: '🟥', url: gn(357), description: 'Radish dad platformer!', color: 'from-red-500 to-red-700', corner: 'games', thumbnail: cover(357) },
  { id: 'gn-dadish2', name: 'Dadish 2', icon: '🟥', url: gn(355), description: 'More radish adventures!', color: 'from-red-400 to-red-600', corner: 'games', thumbnail: cover(355) },
  { id: 'gn-dadish3', name: 'Dadish 3', icon: '🟥', url: gn(356), description: 'Radish trilogy!', color: 'from-red-600 to-red-800', corner: 'games', thumbnail: cover(356) },
  { id: 'gn-dan-the-man', name: 'Dan The Man', icon: '👊', url: gn(520), description: 'Beat em up platformer!', color: 'from-blue-600 to-gray-800', corner: 'games', thumbnail: cover(520) },
  { id: 'gn-doodle-jump', name: 'Doodle Jump', icon: '📝', url: gn(470), description: 'Jump as high as you can!', color: 'from-lime-400 to-green-500', corner: 'games', thumbnail: cover(470) },
  { id: 'gn-antonblast', name: 'Antonblast', icon: '💥', url: gn(711), description: 'Smash everything!', color: 'from-red-500 to-orange-600', corner: 'games', thumbnail: cover(711) },

  // --- Puzzle / Casual ---
  { id: 'gn-2048', name: '2048', icon: '🔢', url: gn(114), description: 'Merge tiles to 2048!', color: 'from-orange-400 to-amber-500', corner: 'games', thumbnail: cover(114) },
  { id: 'gn-cookie-clicker', name: 'Cookie Clicker', icon: '🍪', url: gn(82), description: 'Click cookies forever!', color: 'from-amber-600 to-amber-800', corner: 'games', thumbnail: cover(82) },
  { id: 'gn-bitlife', name: 'BitLife', icon: '👶', url: gn(70), description: 'Text-based life sim!', color: 'from-green-500 to-green-700', corner: 'games', thumbnail: cover(70) },
  { id: 'gn-bloxorz', name: 'Bloxorz', icon: '📦', url: gn(169), description: 'Block rolling puzzle!', color: 'from-blue-600 to-blue-800', corner: 'games', thumbnail: cover(169) },
  { id: 'gn-crossy-road', name: 'Crossy Road', icon: '🐔', url: gn(24), description: 'Cross the road!', color: 'from-green-400 to-green-600', corner: 'games', thumbnail: cover(24) },
  { id: 'gn-candy-crush', name: 'Candy Crush', icon: '🍬', url: gn(171), description: 'Match-3 addiction!', color: 'from-purple-500 to-pink-600', corner: 'games', thumbnail: cover(171) },
  { id: 'gn-cut-rope', name: 'Cut the Rope', icon: '🍬', url: gn(85), description: 'Feed Om Nom!', color: 'from-green-400 to-green-600', corner: 'games', thumbnail: cover(85) },
  { id: 'gn-cut-rope-tt', name: 'Cut the Rope: Time Travel', icon: '⏰', url: gn(213), description: 'Time-traveling candy!', color: 'from-blue-400 to-green-500', corner: 'games', thumbnail: cover(213) },

  // --- Tower Defense ---
  { id: 'gn-btd', name: 'Bloons TD', icon: '🎈', url: gn(71), description: 'Pop the bloons!', color: 'from-green-500 to-blue-600', corner: 'games', thumbnail: cover(71) },
  { id: 'gn-btd2', name: 'Bloons TD 2', icon: '🎈', url: gn(72), description: 'More bloon popping!', color: 'from-green-400 to-blue-500', corner: 'games', thumbnail: cover(72) },
  { id: 'gn-btd3', name: 'Bloons TD 3', icon: '🎈', url: gn(73), description: 'Even more towers!', color: 'from-green-600 to-blue-700', corner: 'games', thumbnail: cover(73) },
  { id: 'gn-btd4', name: 'Bloons TD 4', icon: '🎈', url: gn(74), description: 'Advanced strategies!', color: 'from-blue-500 to-purple-600', corner: 'games', thumbnail: cover(74) },
  { id: 'gn-btd5', name: 'Bloons TD 5', icon: '🎈', url: gn(75), description: 'Ultimate tower defense!', color: 'from-purple-500 to-red-600', corner: 'games', thumbnail: cover(75) },

  // --- Sports / Racing ---
  { id: 'gn-basket-random', name: 'Basket Random', icon: '🏀', url: gn(66), description: 'Wacky basketball!', color: 'from-orange-500 to-orange-700', corner: 'games', thumbnail: cover(66) },
  { id: 'gn-basket-bros', name: 'Basket Bros', icon: '🏀', url: gn(285), description: '2-player basketball!', color: 'from-blue-500 to-orange-500', corner: 'games', thumbnail: cover(285) },
  { id: 'gn-baseball-bros', name: 'Baseball Bros', icon: '⚾', url: gn(547), description: 'Pixel baseball!', color: 'from-red-600 to-blue-700', corner: 'games', thumbnail: cover(547) },
  { id: 'gn-boxing-random', name: 'Boxing Random', icon: '🥊', url: gn(77), description: 'Random boxing!', color: 'from-red-600 to-red-800', corner: 'games', thumbnail: cover(77) },
  { id: 'gn-drift-hunters', name: 'Drift Hunters', icon: '🏎️', url: gn(173), description: '3D drift racing!', color: 'from-gray-700 to-gray-900', corner: 'games', thumbnail: cover(173) },
  { id: 'gn-drift-boss', name: 'Drift Boss', icon: '🚗', url: gn(276), description: 'Drift on the edge!', color: 'from-blue-500 to-blue-700', corner: 'games', thumbnail: cover(276) },

  // --- Classics / Retro ---
  { id: 'gn-angry-birds', name: 'Angry Birds', icon: '🐦', url: gn(63), description: 'Classic bird flinging!', color: 'from-red-500 to-green-600', corner: 'games', thumbnail: cover(63) },
  { id: 'gn-angry-birds-chrome', name: 'Angry Birds Chrome', icon: '🐦', url: gn(316), description: 'Chrome edition!', color: 'from-yellow-500 to-red-500', corner: 'games', thumbnail: cover(316) },
  { id: 'gn-bad-piggies', name: 'Bad Piggies', icon: '🐷', url: gn(752), description: 'Build pig vehicles!', color: 'from-green-500 to-green-700', corner: 'games', thumbnail: cover(752) },
  { id: 'gn-duck-life', name: 'Duck Life', icon: '🦆', url: gn(234), description: 'Train your duck!', color: 'from-yellow-400 to-yellow-600', corner: 'games', thumbnail: cover(234) },
  { id: 'gn-duck-life2', name: 'Duck Life 2', icon: '🦆', url: gn(235), description: 'More duck training!', color: 'from-orange-400 to-yellow-600', corner: 'games', thumbnail: cover(235) },
  { id: 'gn-duck-life3', name: 'Duck Life 3', icon: '🦆', url: gn(236), description: 'Evolution!', color: 'from-green-400 to-yellow-500', corner: 'games', thumbnail: cover(236) },
  { id: 'gn-duck-life4', name: 'Duck Life 4', icon: '🦆', url: gn(237), description: 'Space adventure!', color: 'from-blue-400 to-purple-500', corner: 'games', thumbnail: cover(237) },
  { id: 'gn-bob-robber', name: 'Bob The Robber 2', icon: '🥷', url: gn(76), description: 'Stealth robbery!', color: 'from-gray-700 to-gray-900', corner: 'games', thumbnail: cover(76) },
  { id: 'gn-cubefield', name: 'Cubefield', icon: '🟩', url: gn(84), description: 'Dodge the cubes!', color: 'from-green-500 to-green-700', corner: 'games', thumbnail: cover(84) },
  { id: 'gn-coreball', name: 'Coreball', icon: '🎯', url: gn(83), description: 'Stick the pins!', color: 'from-blue-500 to-blue-700', corner: 'games', thumbnail: cover(83) },
  { id: 'gn-achievement1', name: 'Achievement Unlocked', icon: '🏆', url: gn(60), description: 'Meta achievement game!', color: 'from-yellow-500 to-amber-600', corner: 'games', thumbnail: cover(60) },
  { id: 'gn-achievement2', name: 'Achievement Unlocked 2', icon: '🏆', url: gn(61), description: 'Even more achievements!', color: 'from-amber-500 to-orange-600', corner: 'games', thumbnail: cover(61) },
  { id: 'gn-achievement3', name: 'Achievement Unlocked 3', icon: '🏆', url: gn(62), description: 'Ultimate achievements!', color: 'from-orange-500 to-red-600', corner: 'games', thumbnail: cover(62) },

  // --- Simulation / Sandbox ---
  { id: 'gn-city-smash', name: 'City Smash', icon: '🏙️', url: gn(449), description: 'Destroy cities!', color: 'from-orange-600 to-red-700', corner: 'games', thumbnail: cover(449) },
  { id: 'gn-ages-conflict', name: 'Ages of Conflict', icon: '⚔️', url: gn(444), description: 'Civilization wars!', color: 'from-amber-700 to-red-800', corner: 'games', thumbnail: cover(444) },
  { id: 'gn-adventure-cap', name: 'Adventure Capitalist', icon: '💰', url: gn(354), description: 'Idle business tycoon!', color: 'from-green-500 to-green-700', corner: 'games', thumbnail: cover(354) },
  { id: 'gn-doge-miner', name: 'Doge Miner', icon: '🐕', url: gn(511), description: 'Mine dogecoins!', color: 'from-yellow-500 to-amber-600', corner: 'games', thumbnail: cover(511) },

  // --- .io Games ---
  { id: 'gn-brawl-guys', name: 'Brawl Guys.io', icon: '👊', url: gn(121), description: 'Multiplayer brawler!', color: 'from-purple-500 to-blue-600', corner: 'games', thumbnail: cover(121) },

  // --- RPG / Story ---
  { id: 'gn-oneshot', name: 'Oneshot (LEGACY)', icon: '💡', url: gn(622), description: 'Meta RPG experience!', color: 'from-yellow-500 to-purple-700', corner: 'games', thumbnail: cover(622) },
  { id: 'gn-deltatraveler', name: 'Deltatraveler', icon: '🔺', url: gn(560), description: 'Deltarune fangame!', color: 'from-purple-600 to-blue-700', corner: 'games', thumbnail: cover(560) },
  { id: 'gn-bad-time', name: 'Bad Time Simulator', icon: '💀', url: gn(472), description: 'Fight Sans!', color: 'from-blue-800 to-gray-900', corner: 'games', thumbnail: cover(472) },
  { id: 'gn-bad-monday', name: 'Bad Monday Simulator', icon: '🐱', url: gn(522), description: 'Garfield horror!', color: 'from-orange-600 to-gray-900', corner: 'games', thumbnail: cover(522) },
  { id: 'gn-class09', name: "Class of '09", icon: '🎓', url: gn(259), description: 'Visual novel!', color: 'from-pink-500 to-purple-600', corner: 'games', thumbnail: cover(259) },
  { id: 'gn-endroll', name: 'Endroll', icon: '🎬', url: gn(631), description: 'Dream RPG!', color: 'from-indigo-700 to-purple-900', corner: 'games', thumbnail: cover(631) },

  // --- Misc Popular ---
  { id: 'gn-binding-isaac', name: 'Binding of Isaac', icon: '😢', url: gn(350), description: 'Roguelike dungeon crawler!', color: 'from-amber-700 to-gray-900', corner: 'games', thumbnail: cover(350) },
  { id: 'gn-schoolboy', name: 'Schoolboy Runaway', icon: '🏃', url: gn(605), description: 'Escape school!', color: 'from-blue-500 to-blue-700', corner: 'games', thumbnail: cover(605) },
  { id: 'gn-goose', name: 'Untitled Goose Game', icon: '🦢', url: gn(718), description: 'Honk! Be a goose!', color: 'from-green-400 to-blue-300', corner: 'games', thumbnail: cover(718) },
  { id: 'gn-clover-pit', name: 'Clover Pit', icon: '🍀', url: gn(716), description: 'Lucky platformer!', color: 'from-green-500 to-emerald-600', corner: 'games', thumbnail: cover(716) },
  { id: 'gn-brotato', name: 'Brotato', icon: '🥔', url: gn(723), description: 'Roguelite survivors!', color: 'from-amber-600 to-brown-700', corner: 'games', thumbnail: cover(723) },
  { id: 'gn-elastic-man', name: 'Elastic Man', icon: '🤸', url: gn(197), description: 'Stretch the face!', color: 'from-pink-400 to-pink-600', corner: 'games', thumbnail: cover(197) },
  { id: 'gn-bad-ice1', name: 'Bad Ice Cream', icon: '🍦', url: gn(269), description: 'Co-op ice cream!', color: 'from-cyan-400 to-blue-500', corner: 'games', thumbnail: cover(269) },
  { id: 'gn-bad-ice2', name: 'Bad Ice Cream 2', icon: '🍦', url: gn(270), description: 'More icy fun!', color: 'from-pink-400 to-cyan-500', corner: 'games', thumbnail: cover(270) },
  { id: 'gn-bad-ice3', name: 'Bad Ice Cream 3', icon: '🍦', url: gn(271), description: 'Triple scoop!', color: 'from-green-400 to-blue-500', corner: 'games', thumbnail: cover(271) },
  { id: 'gn-burrito', name: 'Burrito Bison: Launcha Libre', icon: '🌯', url: gn(78), description: 'Launch and smash!', color: 'from-red-500 to-red-700', corner: 'games', thumbnail: cover(78) },
  { id: 'gn-draw-climber', name: 'Draw Climber', icon: '✏️', url: gn(86), description: 'Draw legs to climb!', color: 'from-yellow-400 to-orange-500', corner: 'games', thumbnail: cover(86) },
  { id: 'gn-10min-dawn', name: '10 Minutes Till Dawn', icon: '🌙', url: gn(430), description: 'Survive till dawn!', color: 'from-purple-900 to-gray-950', corner: 'games', thumbnail: cover(430) },
  { id: 'gn-endoparasitic', name: 'Endoparasitic', icon: '🦠', url: gn(286), description: 'Crawl & survive!', color: 'from-red-800 to-gray-900', corner: 'games', thumbnail: cover(286) },
  { id: 'gn-endoparasitic2', name: 'Endoparasitic 2', icon: '🦠', url: gn(724), description: 'More parasite horror!', color: 'from-green-800 to-gray-900', corner: 'games', thumbnail: cover(724) },
  { id: 'gn-cooking-mama', name: 'Cooking Mama', icon: '👩‍🍳', url: gn(681), description: 'Cook delicious meals!', color: 'from-orange-400 to-red-500', corner: 'games', thumbnail: cover(681) },
  { id: 'gn-cooking-mama2', name: 'Cooking Mama 2', icon: '👩‍🍳', url: gn(682), description: 'More recipes!', color: 'from-pink-400 to-orange-500', corner: 'games', thumbnail: cover(682) },
  { id: 'gn-cooking-mama3', name: 'Cooking Mama 3', icon: '👩‍🍳', url: gn(683), description: 'Mama returns!', color: 'from-yellow-400 to-red-500', corner: 'games', thumbnail: cover(683) },
  { id: 'gn-choppy-orc', name: 'Choppy Orc', icon: '🪓', url: gn(464), description: 'Axe-throwing platformer!', color: 'from-green-600 to-green-800', corner: 'games', thumbnail: cover(464) },
  { id: 'gn-circloo', name: 'CircloO', icon: '⭕', url: gn(274), description: 'Physics puzzle!', color: 'from-blue-400 to-blue-600', corner: 'games', thumbnail: cover(274) },
  { id: 'gn-circloo2', name: 'CircloO 2', icon: '⭕', url: gn(275), description: 'More circular puzzles!', color: 'from-purple-400 to-blue-600', corner: 'games', thumbnail: cover(275) },
  { id: 'gn-escape-road', name: 'Escape Road', icon: '🚗', url: gn(264), description: 'Escape the police!', color: 'from-blue-600 to-gray-800', corner: 'games', thumbnail: cover(264) },
  { id: 'gn-escape-road2', name: 'Escape Road 2', icon: '🚗', url: gn(265), description: 'More car chases!', color: 'from-red-600 to-gray-800', corner: 'games', thumbnail: cover(265) },
  { id: 'gn-crazy-cattle', name: 'Crazy Cattle 3D', icon: '🐄', url: gn(164), description: 'Crazy cow physics!', color: 'from-green-500 to-brown-600', corner: 'games', thumbnail: cover(164) },

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

  // NATHANIEL'S CORNER — FNF Mods (file-based via local HTML)
  { id: 'fnf-base', name: 'FNF Base Game', icon: '🎤', url: '/games/fnf/week7/index.html', description: 'The original Week 7!', color: 'from-cyan-500 to-blue-600', corner: 'nathaniel', thumbnail: '/games/fnf/thumbnails/fnf-hd.png' },
  { id: 'fnf-bob', name: 'FNF vs Bob', icon: '😐', url: '/games/fnf/mods/bob.html', description: "Bob's Onslaught v2!", color: 'from-green-500 to-green-700', corner: 'nathaniel', thumbnail: '/games/fnf/thumbnails/bob.png' },
  { id: 'fnf-sonic', name: 'FNF vs Sonic.EXE', icon: '🦔', url: '/games/fnf/mods/sonicexe.html', description: 'Sonic.EXE 3.0/4.0!', color: 'from-blue-700 to-red-800', corner: 'nathaniel', thumbnail: '/games/fnf/thumbnails/sonicexe.png' },
  { id: 'fnf-impostor', name: 'FNF vs Impostor V4', icon: '📮', url: '/games/fnf/mods/impostor.html', description: 'Among Us crossover!', color: 'from-red-500 to-red-700', corner: 'nathaniel', thumbnail: '/games/fnf/thumbnails/impostor.png' },
  { id: 'fnf-tabi', name: 'FNF vs Tabi', icon: '💀', url: '/games/fnf/mods/tabi.html', description: 'Ex-boyfriend revenge!', color: 'from-gray-700 to-gray-900', corner: 'nathaniel', thumbnail: '/games/fnf/thumbnails/tabi.png' },
  { id: 'fnf-zardy', name: 'FNF vs Zardy', icon: '🌽', url: '/games/fnf/mods/zardy.html', description: 'Scarecrow showdown!', color: 'from-amber-700 to-green-900', corner: 'nathaniel', thumbnail: '/games/fnf/thumbnails/zardy.png' },
  { id: 'fnf-nonsense', name: 'FNF vs Nonsense', icon: '🤪', url: '/games/fnf/mods/nonsense.html', description: 'Pure chaos rap battle!', color: 'from-yellow-300 to-orange-400', corner: 'nathaniel', thumbnail: '/games/fnf/thumbnails/nonsense.png' },
  { id: 'fnf-hypno', name: "FNF Hypno's Lullaby v2", icon: '😴', url: '/games/fnf/mods/hypno.html', description: 'Creepy Pokémon mod!', color: 'from-yellow-600 to-purple-800', corner: 'nathaniel', thumbnail: '/games/fnf/thumbnails/hypno.png' },
  { id: 'fnf-pibby', name: 'FNF Pibby Apocalypse', icon: '📺', url: '/games/fnf/mods/pibby.html', description: 'Pibby corruption!', color: 'from-purple-700 to-gray-900', corner: 'nathaniel', thumbnail: '/games/fnf/thumbnails/pibby.png' },
  { id: 'fnf-carol', name: 'FNF vs Carol V2', icon: '🎸', url: '/games/fnf/mods/carol.html', description: 'Rock out with Carol!', color: 'from-pink-500 to-red-600', corner: 'nathaniel', thumbnail: '/games/fnf/thumbnails/carol.png' },
  { id: 'fnf-sunday', name: 'FNF vs Sunday HD', icon: '☀️', url: '/games/fnf/mods/sunday.html', description: 'Sunday remastered HD!', color: 'from-orange-400 to-yellow-500', corner: 'nathaniel', thumbnail: '/games/fnf/thumbnails/sunday.png' },
  { id: 'fnf-shaggy', name: 'FNF vs Shaggy', icon: '💪', url: '/games/fnf/mods/shaggy.html', description: 'God mode Shaggy!', color: 'from-yellow-500 to-green-600', corner: 'nathaniel', thumbnail: '/games/fnf/thumbnails/shaggy.png' },
  { id: 'fnf-whitty', name: 'FNF vs Whitty', icon: '💣', url: '/games/fnf/mods/whitty.html', description: 'Bomb-head showdown!', color: 'from-orange-600 to-red-700', corner: 'nathaniel', thumbnail: '/games/fnf/thumbnails/whitty.png' },
  { id: 'fnf-tricky', name: 'FNF vs Tricky', icon: '🤡', url: '/games/fnf/mods/tricky.html', description: 'Madness Combat clown!', color: 'from-red-600 to-gray-800', corner: 'nathaniel', thumbnail: '/games/fnf/thumbnails/tricky.png' },
  { id: 'fnf-garcello', name: 'FNF vs Garcello', icon: '🚬', url: '/games/fnf/mods/garcello.html', description: 'Chill ghost vibes!', color: 'from-purple-600 to-gray-800', corner: 'nathaniel', thumbnail: '/games/fnf/thumbnails/garcello.png' },
  { id: 'fnf-hex', name: 'FNF vs Hex', icon: '🤖', url: '/games/fnf/mods/hex.html', description: 'Friendly robot rapper!', color: 'from-blue-500 to-cyan-600', corner: 'nathaniel', thumbnail: '/games/fnf/thumbnails/hex.png' },
  { id: 'fnf-sky', name: 'FNF vs Sky', icon: '💙', url: '/games/fnf/mods/sky.html', description: 'Obsessed fangirl!', color: 'from-sky-400 to-blue-600', corner: 'nathaniel', thumbnail: '/games/fnf/thumbnails/sky.png' },
  { id: 'fnf-kapi', name: 'FNF vs Kapi', icon: '🐱', url: '/games/fnf/mods/kapi.html', description: 'Dance pad arcade cat!', color: 'from-orange-400 to-pink-500', corner: 'nathaniel', thumbnail: '/games/fnf/thumbnails/kapi.png' },
  { id: 'fnf-bsides', name: 'FNF B-Sides Remix', icon: '🔵', url: '/games/fnf/mods/bsides.html', description: 'B-Side remixes!', color: 'from-blue-600 to-indigo-700', corner: 'nathaniel', thumbnail: '/games/fnf/thumbnails/bsides.png' },
  { id: 'fnf-dsides', name: 'FNF D-Sides', icon: '🔄', url: '/games/fnf/mods/dsides.html', description: 'Alternate universe remix!', color: 'from-indigo-600 to-purple-700', corner: 'nathaniel', thumbnail: '/games/fnf/thumbnails/dsides.png' },
  { id: 'fnf-indie', name: 'FNF Indie Cross', icon: '🎮', url: '/games/fnf/mods/indie.html', description: 'Cuphead x Sans x Bendy!', color: 'from-amber-500 to-red-600', corner: 'nathaniel', thumbnail: '/games/fnf/thumbnails/infidelity.png' },
  { id: 'fnf-infidelity', name: "Wednesday's Infidelity", icon: '📅', url: '/games/fnf/mods/infidelity.html', description: 'Creepy Wednesday mod!', color: 'from-gray-800 to-red-900', corner: 'nathaniel', thumbnail: '/games/fnf/thumbnails/infidelity.png' },
  { id: 'fnf-marios', name: "FNF Mario's Madness", icon: '🍄', url: '/games/fnf/mods/marios.html', description: 'Creepy Mario mod!', color: 'from-red-600 to-red-800', corner: 'nathaniel', thumbnail: '/games/fnf/thumbnails/suicide-mouse.png' },
  { id: 'fnf-soft', name: 'FNF Soft', icon: '💛', url: '/games/fnf/mods/soft.html', description: 'The soft mod!', color: 'from-yellow-400 to-pink-400', corner: 'nathaniel', thumbnail: '/games/fnf/thumbnails/sunday.png' },
  { id: 'fernis-best', name: 'Fernis Best', icon: '🎮', url: 'https://s3.amazonaws.com/fernisbest/index.html', description: 'Classic fun game!', color: 'from-emerald-500 to-teal-700', corner: 'nathaniel' },
];

interface AnythingButWorkProps {
  onBack: () => void;
}

export function AnythingButWork({ onBack }: AnythingButWorkProps) {
  const [activeCorner, setActiveCorner] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<CornerItem | null>(null);
  const [iframeError, setIframeError] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAIChat, setShowAIChat] = useState(false);
  const iframeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIframeError(false);
    setIframeLoading(true);
    if (iframeTimeoutRef.current) clearTimeout(iframeTimeoutRef.current);
    if (activeItem) {
      iframeTimeoutRef.current = setTimeout(() => setIframeLoading(false), 15000);
    }
    return () => { if (iframeTimeoutRef.current) clearTimeout(iframeTimeoutRef.current); };
  }, [activeItem, retryCount]);

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
      setRetryCount(0);
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
              <h3 className="text-xl font-bold text-white mb-2">Failed to Load</h3>
              <p className="text-gray-400 mb-2 text-sm">This content may be blocked, offline, or slow to respond.</p>
              <p className="text-gray-600 text-xs mb-6 font-mono break-all">{activeItem.url}</p>
              <div className="flex gap-3 justify-center flex-wrap">
                <button onClick={() => { setIframeError(false); setIframeLoading(true); setRetryCount(c => c + 1); }}
                  className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors">🔄 Retry ({retryCount + 1})</button>
                <a href={activeItem.url} target="_blank" rel="noopener noreferrer"
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors text-lg">Open in New Tab ↗</a>
                <button onClick={() => { setActiveItem(null); setIframeError(false); }}
                  className="px-6 py-3 bg-gray-800 text-white rounded-xl font-semibold hover:bg-gray-700 transition-colors">Back</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 relative">
            {iframeLoading && (
              <div className="absolute inset-0 bg-gray-950 flex items-center justify-center z-10">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-400 text-sm mb-1">Loading {activeItem.name}...</p>
                  <p className="text-gray-600 text-xs">If it takes too long, try opening in a new tab</p>
                </div>
              </div>
            )}
            <iframe
              key={`abw-${retryCount}`}
              src={activeItem.url}
              className="w-full h-full absolute inset-0"
              style={{ border: 'none' }}
              allow="autoplay; keyboard-focus; fullscreen"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals allow-popups-to-escape-sandbox"
              referrerPolicy="no-referrer"
              onLoad={() => { setIframeLoading(false); if (iframeTimeoutRef.current) clearTimeout(iframeTimeoutRef.current); }}
              onError={() => setIframeError(true)}
              title={activeItem.name}
            />
          </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
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
                placeholder="🔍 Search games..."
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
                    <div className={`h-24 bg-gradient-to-br ${item.color} flex items-center justify-center relative overflow-hidden`}>
                      {item.thumbnail ? (
                        <img src={item.thumbnail} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" loading="lazy" />
                      ) : (
                        <span className="text-3xl group-hover:scale-110 transition-transform drop-shadow-lg">{item.icon}</span>
                      )}
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
