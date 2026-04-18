import { useState, useEffect, useCallback, useRef } from 'react';
import { apiToggleFav, apiGetFavs, getCodeId } from '../lib/api';
import { supabase } from '../integrations/supabase/client';
import { AnythingButWork } from './AnythingButWork';
import { FeedbackWidget } from './FeedbackWidget';

interface GamePortalProps {
  username: string;
  isAdmin: boolean;
  onLogout: () => void;
  onAdminPanel: () => void;
}

interface Game {
  id: string;
  name: string;
  icon: string;
  category: string;
  url: string;
  description: string;
  color: string;
}

const games: Game[] = [
  // ACTION
  { id: 'slope', name: 'Slope', icon: '🎿', category: 'Action', url: 'https://slope-game.github.io/', description: 'Roll down an endless slope!', color: 'from-green-500 to-emerald-600' },
  { id: 'run3', name: 'Run 3', icon: '🏃', category: 'Action', url: 'https://run3game.github.io/', description: 'Run through space tunnels', color: 'from-purple-500 to-violet-600' },
  { id: 'subway', name: 'Subway Surfers', icon: '🛹', category: 'Action', url: 'https://subwaysurf.github.io/', description: 'Surf the subway rails!', color: 'from-yellow-500 to-amber-600' },
  { id: 'tunnelrush', name: 'Tunnel Rush', icon: '🌀', category: 'Action', url: 'https://tunnel-rush.github.io/', description: 'Dodge in neon tunnels', color: 'from-pink-500 to-purple-600' },
  { id: 'crossy', name: 'Crossy Road', icon: '🐔', category: 'Action', url: 'https://crossyroad.github.io/', description: 'Cross without getting hit!', color: 'from-lime-500 to-green-600' },
  { id: 'snowrider', name: 'Snow Rider 3D', icon: '⛷️', category: 'Action', url: 'https://snow-rider-3d.github.io/', description: 'Ride snowy mountains', color: 'from-cyan-400 to-blue-500' },
  { id: 'getaway', name: 'Getaway Shootout', icon: '💨', category: 'Action', url: 'https://getawayshootout.github.io/', description: 'Race to escape!', color: 'from-purple-500 to-pink-500' },
  { id: 'rooftop', name: 'Rooftop Snipers', icon: '🎯', category: 'Action', url: 'https://rooftopsnipers.github.io/', description: 'Snipe from rooftops!', color: 'from-blue-700 to-gray-800' },
  { id: 'tanktrouble', name: 'Tank Trouble', icon: '🪖', category: 'Action', url: 'https://tanktrouble.github.io/', description: 'Tank battle in a maze!', color: 'from-green-600 to-green-800' },
  { id: 'jetpack', name: 'Jetpack Joyride', icon: '🚀', category: 'Action', url: 'https://jetpackjoyride.github.io/', description: 'Jetpack through obstacles!', color: 'from-blue-500 to-indigo-600' },
  { id: 'basketrandom', name: 'Basket Random', icon: '🏀', category: 'Action', url: 'https://basket-random.github.io/', description: 'Wacky basketball!', color: 'from-orange-500 to-red-600' },
  // SHOOTER
  { id: '1v1lol', name: '1v1.LOL', icon: '🔫', category: 'Shooter', url: 'https://1v1lol.com/', description: 'Build and battle!', color: 'from-red-500 to-rose-600' },
  { id: 'shellshock', name: 'Shell Shockers', icon: '🥚', category: 'Shooter', url: 'https://shellshock.io/', description: 'FPS with eggs!', color: 'from-yellow-400 to-orange-500' },
  { id: 'krunker', name: 'Krunker.io', icon: '🎯', category: 'Shooter', url: 'https://krunker.io/', description: 'Pixel FPS shooter', color: 'from-blue-600 to-blue-800' },
  { id: 'bulletforce', name: 'Bullet Force', icon: '💥', category: 'Shooter', url: 'https://bulletforcegame.com/', description: 'Intense online FPS', color: 'from-gray-700 to-gray-900' },
  // IO
  { id: 'agario', name: 'Agar.io', icon: '⭕', category: 'IO', url: 'https://agar.io/', description: 'Eat or be eaten', color: 'from-teal-500 to-cyan-600' },
  { id: 'slither', name: 'Slither.io', icon: '🐍', category: 'IO', url: 'https://slither.io/', description: 'Grow your snake!', color: 'from-green-500 to-lime-500' },
  { id: 'diep', name: 'Diep.io', icon: '🔵', category: 'IO', url: 'https://diep.io/', description: 'Tank battle arena', color: 'from-blue-500 to-blue-700' },
  { id: 'paperio', name: 'Paper.io 2', icon: '📄', category: 'IO', url: 'https://paper-io.com/', description: 'Claim territory!', color: 'from-indigo-500 to-blue-600' },
  { id: 'smashkarts', name: 'Smash Karts', icon: '🏎️', category: 'IO', url: 'https://smashkarts.io/', description: 'Battle kart racing', color: 'from-green-400 to-teal-500' },
  { id: 'zombsroyale', name: 'Zombs Royale', icon: '🔫', category: 'IO', url: 'https://zombsroyale.io/', description: 'Battle royale!', color: 'from-red-600 to-orange-700' },
  { id: 'surviv', name: 'Surviv.io', icon: '🪖', category: 'IO', url: 'https://surviv.io/', description: 'Top-down battle royale', color: 'from-yellow-700 to-amber-800' },
  { id: 'wormate', name: 'Wormate.io', icon: '🐛', category: 'IO', url: 'https://wormate.io/', description: 'Snake with candy!', color: 'from-pink-500 to-red-500' },
  // SPORTS
  { id: 'retrobowl', name: 'Retro Bowl', icon: '🏈', category: 'Sports', url: 'https://retrobowl.me/', description: 'Classic football sim!', color: 'from-amber-500 to-orange-600' },
  { id: 'soccerhero', name: 'Soccer Heroes', icon: '⚽', category: 'Sports', url: 'https://soccerheroes.github.io/', description: 'Score goals!', color: 'from-green-500 to-green-700' },
  { id: 'baseballpro', name: 'Baseball Pro', icon: '⚾', category: 'Sports', url: 'https://baseballpro.github.io/', description: 'Hit home runs!', color: 'from-red-500 to-red-700' },
  // RACING
  { id: 'drifthunters', name: 'Drift Hunters', icon: '🏎️', category: 'Racing', url: 'https://drifthunters.io/', description: 'Drift on various tracks', color: 'from-blue-500 to-cyan-600' },
  { id: 'motox3m', name: 'Moto X3M', icon: '🏍️', category: 'Racing', url: 'https://motox3m.io/', description: 'Extreme moto stunts', color: 'from-red-600 to-pink-600' },
  { id: 'motox3m2', name: 'Moto X3M 2', icon: '🏍️', category: 'Racing', url: 'https://motox3m2.io/', description: 'More extreme stunts!', color: 'from-orange-500 to-red-500' },
  { id: 'roadrage', name: 'Road Rage', icon: '🚗', category: 'Racing', url: 'https://roadrage.github.io/', description: 'Crazy road racing!', color: 'from-gray-600 to-gray-800' },
  // ARCADE
  { id: 'geometrydash', name: 'Geometry Dash', icon: '🔷', category: 'Arcade', url: 'https://geometrydash.io/', description: 'Jump to the beat!', color: 'from-blue-600 to-indigo-700' },
  { id: 'flappy', name: 'Flappy Bird', icon: '🐦', category: 'Arcade', url: 'https://flappybird.io/', description: 'Tap to fly through pipes', color: 'from-green-400 to-cyan-500' },
  { id: 'pacman', name: 'Pac-Man', icon: '🟡', category: 'Arcade', url: 'https://www.google.com/logos/2010/pacman10-i.html', description: 'Classic arcade game', color: 'from-yellow-400 to-yellow-600' },
  { id: 'tetris', name: 'Tetris', icon: '🟦', category: 'Arcade', url: 'https://tetris.com/play-tetris', description: 'Classic block puzzle', color: 'from-blue-500 to-purple-600' },
  { id: 'snake', name: 'Snake', icon: '🐍', category: 'Arcade', url: 'https://playsnake.org/', description: 'Classic snake game', color: 'from-green-600 to-green-800' },
  { id: 'doodlejump', name: 'Doodle Jump', icon: '📝', category: 'Arcade', url: 'https://doodlejump.io/', description: 'Jump as high as you can!', color: 'from-lime-400 to-green-500' },
  { id: 'spaceinvaders', name: 'Space Invaders', icon: '👾', category: 'Arcade', url: 'https://spaceinvaders.github.io/', description: 'Defend from alien attack!', color: 'from-gray-700 to-gray-900' },
  { id: 'fruitninja', name: 'Fruit Ninja', icon: '🍉', category: 'Arcade', url: 'https://fruitninja.github.io/', description: 'Slice fruit!', color: 'from-red-400 to-orange-500' },
  { id: 'templeruncg', name: 'Temple Run', icon: '🏛️', category: 'Arcade', url: 'https://templerun.io/', description: 'Run from the temple!', color: 'from-amber-700 to-orange-700' },
  { id: 'chromedino', name: 'Chrome Dino', icon: '🦕', category: 'Arcade', url: 'https://chromedino.com/', description: 'The classic offline dino game!', color: 'from-gray-500 to-gray-700' },
  { id: 'asteroids', name: 'Asteroids', icon: '☄️', category: 'Arcade', url: 'https://asteroidsgame.io/', description: 'Blast asteroids in space!', color: 'from-gray-800 to-black' },
  // PUZZLE
  { id: '2048', name: '2048', icon: '🔢', category: 'Puzzle', url: 'https://play2048.co/', description: 'Merge tiles to 2048', color: 'from-orange-400 to-amber-500' },
  { id: 'wordle', name: 'Wordle', icon: '📝', category: 'Puzzle', url: 'https://www.nytimes.com/games/wordle/index.html', description: 'Guess the word in 6 tries', color: 'from-green-600 to-emerald-700' },
  { id: 'sudoku', name: 'Sudoku', icon: '🔢', category: 'Puzzle', url: 'https://sudoku.com/', description: 'Classic number puzzle', color: 'from-blue-400 to-blue-600' },
  { id: 'chess', name: 'Chess', icon: '♟️', category: 'Puzzle', url: 'https://www.chess.com/play/computer', description: 'Play chess vs computer', color: 'from-gray-600 to-gray-800' },
  { id: 'checkers', name: 'Checkers', icon: '🔴', category: 'Puzzle', url: 'https://checkers.online/', description: 'Classic checkers!', color: 'from-red-600 to-red-800' },
  { id: 'minesweeper', name: 'Minesweeper', icon: '💣', category: 'Puzzle', url: 'https://minesweeper.io/', description: 'Avoid the mines!', color: 'from-gray-500 to-gray-700' },
  { id: 'jigsaw', name: 'Jigsaw Puzzles', icon: '🧩', category: 'Puzzle', url: 'https://www.jigsawplanet.com/', description: 'Online jigsaw puzzles', color: 'from-teal-500 to-cyan-600' },
  // PLATFORMER
  { id: 'vex3', name: 'Vex 3', icon: '🏃', category: 'Platformer', url: 'https://vex3.io/', description: 'Hardcore platformer!', color: 'from-teal-600 to-teal-800' },
  { id: 'vex4', name: 'Vex 4', icon: '🏃', category: 'Platformer', url: 'https://vex4.io/', description: 'Even harder obstacles!', color: 'from-cyan-600 to-cyan-800' },
  { id: 'vex5', name: 'Vex 5', icon: '🏃', category: 'Platformer', url: 'https://vex5.io/', description: 'Ultimate Vex challenge!', color: 'from-blue-600 to-blue-800' },
  { id: 'happywheels', name: 'Happy Wheels', icon: '🛞', category: 'Platformer', url: 'https://www.totaljerkface.com/happy_wheels.tjf', description: 'Ragdoll physics fun!', color: 'from-red-600 to-orange-600' },
  { id: 'fireboy', name: 'Fireboy & Watergirl', icon: '🔥', category: 'Platformer', url: 'https://www.coolmathgames.com/0-fireboy-and-water-girl-in-the-forest-temple', description: 'Co-op temple adventure!', color: 'from-orange-500 to-blue-500' },
  { id: 'bobrobbber', name: 'Bob The Robber', icon: '🦹', category: 'Platformer', url: 'https://bobtherobber.io/', description: 'Stealth heist action!', color: 'from-indigo-600 to-indigo-800' },
  { id: 'superheroman', name: 'Stickman Fighter', icon: '🥷', category: 'Platformer', url: 'https://stickmanfighter.io/', description: 'Stick figure battles!', color: 'from-slate-600 to-slate-800' },
  // SANDBOX
  { id: 'minecraftclassic', name: 'Minecraft Classic', icon: '⛏️', category: 'Sandbox', url: 'https://classic.minecraft.net/', description: 'Official Minecraft Classic!', color: 'from-green-700 to-lime-600' },
  { id: 'eaglercraft', name: 'Eaglercraft', icon: '🦅', category: 'Sandbox', url: 'https://eaglercraft.com/mc/1.8.8/', description: 'Minecraft 1.8 in browser!', color: 'from-emerald-600 to-green-700' },
  // STRATEGY
  { id: 'bloonstd', name: 'Bloons TD 5', icon: '🎈', category: 'Strategy', url: 'https://www.bloons.com/games/btd5/', description: 'Pop the bloons!', color: 'from-red-400 to-red-600' },
  { id: 'kingdomrush', name: 'Kingdom Rush', icon: '🏰', category: 'Strategy', url: 'https://www.kongregate.com/games/Armor_Games/kingdom-rush', description: 'Tower defense classic!', color: 'from-amber-600 to-red-600' },
  { id: 'colonists', name: 'The Colonists', icon: '🏗️', category: 'Strategy', url: 'https://thecolonists.io/', description: 'Build your colony!', color: 'from-blue-500 to-teal-600' },
  // FIGHTING
  { id: 'electricman', name: 'Electric Man 2', icon: '⚡', category: 'Fighting', url: 'https://electricman2.io/', description: 'Stick figure fighter!', color: 'from-blue-500 to-cyan-500' },
  { id: 'streetfighter', name: 'Street Fighter', icon: '🥊', category: 'Fighting', url: 'https://www.streetfighter.com/6/buckler/', description: 'Classic fighting game', color: 'from-yellow-500 to-red-600' },
  { id: 'mortalkombat', name: 'Mortal Kombat', icon: '🩸', category: 'Fighting', url: 'https://mkwarehouse.com/', description: 'Brutal fighting game!', color: 'from-gray-900 to-red-900' },
  // HORROR
  { id: 'fnaf', name: 'FNAF', icon: '🐻', category: 'Horror', url: 'https://fnaf-game.com/', description: "Five Nights at Freddy's!", color: 'from-gray-800 to-gray-950' },
  { id: 'baldi', name: "Baldi's Basics", icon: '📏', category: 'Horror', url: 'https://baldisbasicsgame.com/', description: "Don't let Baldi catch you!", color: 'from-yellow-600 to-yellow-800' },
  { id: 'granny', name: 'Granny', icon: '👵', category: 'Horror', url: 'https://grannygame.io/', description: 'Escape the creepy house!', color: 'from-gray-700 to-gray-900' },
  { id: 'granny2', name: 'Granny Chapter Two', icon: '👵', category: 'Horror', url: 'https://grannygame.io/granny-chapter-two/', description: 'Escape again with Grandpa!', color: 'from-gray-800 to-red-900' },
  { id: 'granny3', name: 'Granny 3', icon: '👵', category: 'Horror', url: 'https://grannygame.io/granny-3/', description: 'The scariest escape yet!', color: 'from-red-900 to-gray-950' },
  // IDLE
  { id: 'cookieclicker', name: 'Cookie Clicker', icon: '🍪', category: 'Idle', url: 'https://orteil.dashnet.org/cookieclicker/', description: 'Click cookies, build an empire!', color: 'from-amber-400 to-yellow-500' },
  { id: 'clickerheroes', name: 'Clicker Heroes', icon: '⚔️', category: 'Idle', url: 'https://www.clickerheroes.com/', description: 'Click to defeat monsters!', color: 'from-red-500 to-purple-600' },
  { id: 'idleminer', name: 'Idle Miner', icon: '⛏️', category: 'Idle', url: 'https://www.y8.com/games/idle_miner', description: 'Mine resources automatically!', color: 'from-stone-500 to-stone-700' },
  { id: 'adventurecap', name: 'Adventure Capitalist', icon: '💰', category: 'Idle', url: 'https://www.kongregate.com/games/HyperHippoGames/adventure-capitalist', description: 'Build your business empire!', color: 'from-green-500 to-emerald-700' },
  // SIMULATION
  { id: 'papaspizzeria', name: "Papa's Pizzeria", icon: '🍕', category: 'Simulation', url: 'https://www.coolmathgames.com/0-papas-pizzeria', description: 'Run a pizza shop!', color: 'from-red-500 to-yellow-500' },
  { id: 'papasfreezeria', name: "Papa's Freezeria", icon: '🍦', category: 'Simulation', url: 'https://www.coolmathgames.com/0-papas-freezeria', description: 'Make ice cream sundaes!', color: 'from-blue-400 to-cyan-500' },
  { id: 'papasburgeria', name: "Papa's Burgeria", icon: '🍔', category: 'Simulation', url: 'https://www.coolmathgames.com/0-papas-burgeria', description: 'Flip burgers to order!', color: 'from-amber-500 to-red-500' },
  { id: 'universesim', name: 'Universe Sandbox', icon: '🌌', category: 'Simulation', url: 'https://universesandbox.io/', description: 'Simulate the universe!', color: 'from-indigo-800 to-purple-900' },
  // SOCIAL
  { id: 'garticphone', name: 'Gartic Phone', icon: '📞', category: 'Social', url: 'https://garticphone.com/', description: 'Telephone drawing game!', color: 'from-orange-400 to-pink-500' },
  { id: 'skribbl', name: 'Skribbl.io', icon: '🎨', category: 'Social', url: 'https://skribbl.io/', description: 'Online Pictionary!', color: 'from-purple-400 to-pink-500' },
  { id: 'kahoot', name: 'Kahoot!', icon: '❓', category: 'Social', url: 'https://kahoot.it/', description: 'Quiz games!', color: 'from-purple-600 to-red-600' },
  // COOLMATH
  { id: 'coolmath-main', name: 'CoolMath Games', icon: '🧮', category: 'CoolMath', url: 'https://www.coolmathgames.com/', description: 'School-friendly game hub!', color: 'from-blue-600 to-cyan-700' },
  { id: 'coolmath-run3', name: 'Run 3 (CM)', icon: '🏃', category: 'CoolMath', url: 'https://www.coolmathgames.com/0-run-3', description: 'CoolMath Run 3', color: 'from-purple-500 to-violet-600' },
  { id: 'coolmath-slope', name: 'Slope (CM)', icon: '🎿', category: 'CoolMath', url: 'https://www.coolmathgames.com/0-slope', description: 'CoolMath Slope', color: 'from-green-500 to-emerald-600' },
  { id: 'coolmath-moto', name: 'Moto X3M (CM)', icon: '🏍️', category: 'CoolMath', url: 'https://www.coolmathgames.com/0-moto-x3m', description: 'CoolMath Moto X3M', color: 'from-red-600 to-pink-600' },
  { id: 'coolmath-2048', name: '2048 (CM)', icon: '🔢', category: 'CoolMath', url: 'https://www.coolmathgames.com/0-2048', description: 'CoolMath 2048', color: 'from-orange-400 to-amber-500' },
  { id: 'coolmath-chess', name: 'Chess (CM)', icon: '♟️', category: 'CoolMath', url: 'https://www.coolmathgames.com/0-chess', description: 'CoolMath Chess', color: 'from-gray-600 to-gray-800' },
  { id: 'coolmath-snake', name: 'Snake (CM)', icon: '🐍', category: 'CoolMath', url: 'https://www.coolmathgames.com/0-snake', description: 'CoolMath Snake', color: 'from-green-600 to-green-800' },
  { id: 'coolmath-drift', name: 'Drift Hunters (CM)', icon: '🏎️', category: 'CoolMath', url: 'https://www.coolmathgames.com/0-drift-hunters', description: 'CoolMath Drift Hunters', color: 'from-blue-500 to-cyan-600' },
  { id: 'coolmath-retrobowl', name: 'Retro Bowl (CM)', icon: '🏈', category: 'CoolMath', url: 'https://www.coolmathgames.com/0-retro-bowl', description: 'CoolMath Retro Bowl', color: 'from-amber-500 to-orange-600' },
  { id: 'coolmath-papa', name: "Papa's Games (CM)", icon: '👨‍🍳', category: 'CoolMath', url: 'https://www.coolmathgames.com/papa-louie', description: "All Papa's Games on CoolMath", color: 'from-red-500 to-yellow-500' },
  { id: 'coolmath-bob', name: 'Bob The Robber (CM)', icon: '🦹', category: 'CoolMath', url: 'https://www.coolmathgames.com/0-bob-the-robber', description: 'CoolMath Bob The Robber', color: 'from-indigo-600 to-indigo-800' },
  { id: 'coolmath-copter', name: 'Copter Royale (CM)', icon: '🚁', category: 'CoolMath', url: 'https://www.coolmathgames.com/0-copter-royale', description: 'Helicopter battle!', color: 'from-teal-500 to-cyan-600' },
  { id: 'coolmath-fireboy', name: 'Fireboy CM', icon: '🔥', category: 'CoolMath', url: 'https://www.coolmathgames.com/0-fireboy-and-water-girl-in-the-forest-temple', description: 'CoolMath Fireboy & Watergirl', color: 'from-orange-500 to-blue-500' },
  // MATH GAMES
  { id: 'prodigygame', name: 'Prodigy Math', icon: '🧙', category: 'Math Games', url: 'https://www.prodigygame.com/', description: 'RPG math adventure!', color: 'from-purple-600 to-indigo-700' },
  { id: 'mathplayground', name: 'Math Playground', icon: '🔢', category: 'Math Games', url: 'https://www.mathplayground.com/', description: 'Math games & puzzles', color: 'from-green-500 to-teal-600' },
  { id: 'desmos', name: 'Desmos', icon: '📐', category: 'Math Games', url: 'https://www.desmos.com/calculator', description: 'Graphing calculator', color: 'from-blue-500 to-purple-600' },
  { id: 'gimkit', name: 'Gimkit', icon: '💡', category: 'Math Games', url: 'https://www.gimkit.com/', description: 'Play & earn in-game money!', color: 'from-yellow-500 to-amber-600' },
  // RETRO
  { id: 'pong', name: 'Pong', icon: '🏓', category: 'Retro', url: 'https://www.ponggame.org/', description: 'The original video game!', color: 'from-gray-800 to-black' },
  { id: 'breakout', name: 'Breakout', icon: '🧱', category: 'Retro', url: 'https://www.google.com/logos/2012/breakout-2012-hp.html', description: 'Bounce the ball!', color: 'from-red-500 to-orange-600' },
  { id: 'donkeykong', name: 'Donkey Kong', icon: '🦍', category: 'Retro', url: 'https://www.classicgamesarcade.com/game/21645/donkey-kong-game.html', description: 'Classic platformer!', color: 'from-red-700 to-orange-700' },
  { id: 'galaga', name: 'Galaga', icon: '🚀', category: 'Retro', url: 'https://www.classicgamesarcade.com/game/21619/galaga-game.html', description: 'Classic space shooter!', color: 'from-blue-900 to-black' },
];

const allCategories = ['All', 'CoolMath', 'Action', 'Shooter', 'IO', 'Sports', 'Racing', 'Arcade', 'Puzzle', 'Platformer', 'Sandbox', 'Strategy', 'Fighting', 'Horror', 'Idle', 'Simulation', 'Social', 'Math Games', 'Retro'];

export function GamePortal({ username, isAdmin, onLogout, onAdminPanel }: GamePortalProps) {
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [showFavsOnly, setShowFavsOnly] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [newTabMode, setNewTabMode] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const iframeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showABW, setShowABW] = useState(false);
  // Default landing view = Lumin Games Hub (700+ games)
  const [showLuminHub, setShowLuminHub] = useState(true);
  const [luminLoading, setLuminLoading] = useState(true);

  // Load favorites from cloud
  useEffect(() => {
    apiGetFavs().then(result => {
      if (result.favorites) setFavorites(result.favorites);
    });
  }, []);

  // Listen for realtime favorite changes (cross-device sync)
  useEffect(() => {
    const codeId = getCodeId();
    if (!codeId) return;

    const channel = supabase
      .channel('favorites-sync')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'code_favorites',
      }, () => {
        // Refresh favorites
        apiGetFavs().then(result => {
          if (result.favorites) setFavorites(result.favorites);
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    setIframeError(false);
    setNewTabMode(false);
    setIframeLoading(true);
    setRetryCount(0);
    if (iframeTimeoutRef.current) clearTimeout(iframeTimeoutRef.current);
    if (activeGame) {
      iframeTimeoutRef.current = setTimeout(() => {
        setIframeLoading(false);
      }, 15000);
    }
    return () => { if (iframeTimeoutRef.current) clearTimeout(iframeTimeoutRef.current); };
  }, [activeGame, retryCount]);

  const toggleFav = useCallback(async (id: string) => {
    // Optimistic update
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
    // Sync to cloud
    await apiToggleFav(id);
  }, []);

  const openGame = (game: Game) => { setActiveGame(game); setIframeError(false); setNewTabMode(false); };

  const filtered = games.filter(g => {
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase()) || g.category.toLowerCase().includes(search.toLowerCase()) || g.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'All' || category === g.category;
    const matchFav = !showFavsOnly || favorites.includes(g.id);
    return matchSearch && matchCat && matchFav;
  });

  const favGames = games.filter(g => favorites.includes(g.id));
  const popular = ['slope', 'retrobowl', 'cookieclicker', '1v1lol', 'geometrydash', 'smashkarts', 'krunker', 'agario', 'flappy', 'chromedino', 'minecraftclassic', 'garticphone'];
  const popularGames = popular.map(id => games.find(g => g.id === id)).filter(Boolean) as Game[];
  if (showABW) {
    return <AnythingButWork onBack={() => setShowABW(false)} />;
  }

  if (activeGame) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <div className="bg-gray-900 px-3 py-2 flex items-center justify-between border-b border-gray-800 shrink-0 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => setActiveGame(null)} className="px-3 py-1.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium shrink-0">← Back</button>
            <span className="text-xl shrink-0">{activeGame.icon}</span>
            <span className="text-white font-semibold hidden sm:inline truncate">{activeGame.name}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => toggleFav(activeGame.id)} className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-lg" title="Favorite">
              {favorites.includes(activeGame.id) ? '⭐' : '☆'}
            </button>
            <a href={activeGame.url} target="_blank" rel="noopener noreferrer"
              className="px-2 py-1.5 bg-blue-700 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs font-bold flex items-center gap-1">↗ New Tab</a>
            <button onClick={() => { const el = document.getElementById('game-frame') as HTMLIFrameElement; el?.requestFullscreen?.(); }}
              className="px-2 py-1.5 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-xs hidden sm:block">⛶ Full</button>
            <button onClick={onLogout} className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-bold" title="PANIC - Quick Exit!">🚨</button>
          </div>
        </div>
        {newTabMode ? (
          <div className="flex-1 flex items-center justify-center bg-gray-950">
            <div className="text-center p-8 max-w-md">
              <div className="text-6xl mb-4">{activeGame.icon}</div>
              <h3 className="text-xl font-bold text-white mb-2">{activeGame.name}</h3>
              <p className="text-gray-400 mb-6 text-sm">This game works best in a new tab. Click below to open it!</p>
              <div className="flex gap-3 justify-center flex-wrap">
                <a href={activeGame.url} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors text-lg">🎮 Open Game ↗</a>
                <button onClick={() => setNewTabMode(false)} className="px-6 py-3 bg-gray-800 text-white rounded-xl font-semibold hover:bg-gray-700 transition-colors">Try Iframe</button>
                <button onClick={() => setActiveGame(null)} className="px-6 py-3 bg-gray-700 text-gray-300 rounded-xl font-semibold hover:bg-gray-600 transition-colors">Back</button>
              </div>
            </div>
          </div>
        ) : iframeError ? (
          <div className="flex-1 flex items-center justify-center bg-gray-950">
            <div className="text-center p-8 max-w-md">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-bold text-white mb-2">Game Failed to Load</h3>
              <p className="text-gray-400 mb-2 text-sm">This game may be blocked, offline, or slow to respond.</p>
              <p className="text-gray-600 text-xs mb-6 font-mono break-all">{activeGame.url}</p>
              <div className="flex gap-3 justify-center flex-wrap">
                <button onClick={() => { setIframeError(false); setIframeLoading(true); setRetryCount(c => c + 1); }}
                  className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors">🔄 Retry ({retryCount + 1})</button>
                <a href={activeGame.url} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors text-lg">🎮 Open in New Tab ↗</a>
                <button onClick={() => setActiveGame(null)} className="px-6 py-3 bg-gray-800 text-white rounded-xl font-semibold hover:bg-gray-700 transition-colors">Back to Games</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 relative">
            {iframeLoading && (
              <div className="absolute inset-0 bg-gray-950 flex items-center justify-center z-10">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-400 text-sm mb-1">Loading {activeGame.name}...</p>
                  <p className="text-gray-600 text-xs">If it takes too long, try opening in a new tab</p>
                </div>
              </div>
            )}
            <iframe
              key={`game-${retryCount}`}
              id="game-frame"
              src={activeGame.url}
              className="w-full h-full border-0 absolute inset-0"
              allow="fullscreen; autoplay; gamepad; accelerometer; gyroscope; microphone; camera"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals allow-popups-to-escape-sandbox allow-downloads"
              referrerPolicy="no-referrer"
              onLoad={() => { setIframeLoading(false); if (iframeTimeoutRef.current) clearTimeout(iframeTimeoutRef.current); }}
              onError={() => setIframeError(true)}
              title={activeGame.name}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0">🎮</div>
            <div className="min-w-0">
              <h1 className="text-base font-bold">🎮 Game Portal</h1>
              <p className="text-xs text-gray-500 truncate">{username} · {games.length} games · ☁️ Cloud synced</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setShowABW(true)} className="px-3 py-2 bg-purple-600/20 text-purple-400 rounded-lg text-sm font-medium hover:bg-purple-600/30 transition-colors border border-purple-600/30">🚫📚 ABW</button>
            {isAdmin && (
              <button onClick={onAdminPanel} className="px-3 py-2 bg-yellow-600/20 text-yellow-400 rounded-lg text-sm font-medium hover:bg-yellow-600/30 transition-colors border border-yellow-600/30">⚙️ Admin</button>
            )}
            <button onClick={onLogout} className="px-3 py-2 bg-red-900/30 text-red-400 rounded-lg text-sm font-medium hover:bg-red-900/50 transition-colors border border-red-800/30" title="Exit to math site">🚨 Exit</button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-5">
        <div className="flex flex-col gap-3 mb-5">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${games.length} games...`}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors text-sm" />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">✕</button>}
            </div>
            <button onClick={() => setShowFavsOnly(v => !v)}
              className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 shrink-0 ${showFavsOnly ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/30' : 'bg-gray-900 text-gray-400 border border-gray-800 hover:bg-gray-800'}`}>
              ⭐ {favGames.length > 0 ? `(${favGames.length})` : 'Favs'}
            </button>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {allCategories.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${category === c ? 'bg-purple-600 text-white' : 'bg-gray-900 text-gray-500 hover:bg-gray-800 hover:text-gray-300 border border-gray-800'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {favGames.length > 0 && !showFavsOnly && !search && (
          <div className="mb-6">
            <h2 className="text-sm font-bold mb-2 text-yellow-400 uppercase tracking-wide">⭐ Your Favorites</h2>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {favGames.map(game => (
                <button key={game.id} onClick={() => openGame(game)}
                  className="bg-gray-900 border border-yellow-600/30 rounded-xl p-2.5 text-center hover:border-yellow-400/60 hover:bg-gray-800 transition-all group shrink-0 w-20">
                  <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">{game.icon}</div>
                  <p className="text-[10px] font-medium text-gray-300 leading-tight truncate">{game.name}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {category === 'All' && !search && !showFavsOnly && (
          <div className="mb-6">
            <h2 className="text-sm font-bold mb-2 text-purple-400 uppercase tracking-wide">🔥 Popular</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
              {popularGames.map(game => (
                <button key={game.id} onClick={() => openGame(game)}
                  className={`bg-gradient-to-br ${game.color} rounded-xl p-3 text-center hover:scale-105 hover:shadow-lg hover:shadow-black/30 transition-all group relative`}>
                  <div className="text-2xl mb-1 group-hover:scale-110 transition-transform drop-shadow">{game.icon}</div>
                  <p className="text-[10px] font-bold text-white leading-tight truncate drop-shadow">{game.name}</p>
                  <button onClick={e => { e.stopPropagation(); toggleFav(game.id); }}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/30 rounded-full flex items-center justify-center hover:bg-black/50 transition-colors text-[9px]">
                    {favorites.includes(game.id) ? '⭐' : '☆'}
                  </button>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-300">
            {showFavsOnly ? '⭐ Favorites' : search ? `Results for "${search}"` : category === 'All' ? '🎮 All Games' : `📁 ${category}`}
            <span className="text-gray-600 font-normal text-sm ml-2">({filtered.length} games)</span>
          </h2>
          {(search || category !== 'All' || showFavsOnly) && (
            <button onClick={() => { setSearch(''); setCategory('All'); setShowFavsOnly(false); }} className="text-xs text-purple-400 hover:text-purple-300 transition-colors">Clear filters ✕</button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-gray-400 text-lg mb-2">No games found.</p>
            <button onClick={() => { setSearch(''); setCategory('All'); }} className="text-purple-400 text-sm hover:underline">Clear filters</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
            {filtered.map(game => (
              <div key={game.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-600 hover:shadow-lg hover:shadow-black/30 transition-all group cursor-pointer"
                onClick={() => openGame(game)}>
                <div className={`h-20 bg-gradient-to-br ${game.color} flex items-center justify-center relative`}>
                  <span className="text-3xl group-hover:scale-110 transition-transform drop-shadow-lg">{game.icon}</span>
                  <button onClick={e => { e.stopPropagation(); toggleFav(game.id); }}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/30 rounded-full flex items-center justify-center hover:bg-black/50 transition-colors text-xs" title="Favorite">
                    {favorites.includes(game.id) ? '⭐' : '☆'}
                  </button>
                  <a href={game.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                    className="absolute top-1 left-1 w-6 h-6 bg-black/30 rounded-full flex items-center justify-center hover:bg-blue-600/80 transition-colors text-[10px] font-bold text-white" title="Open in new tab">↗</a>
                  <span className="absolute bottom-1 right-1 text-[8px] text-white/50 font-mono">{game.category}</span>
                </div>
                <div className="p-2">
                  <h3 className="font-bold text-white text-xs mb-0.5 leading-tight line-clamp-1">{game.name}</h3>
                  <p className="text-[10px] text-gray-500 leading-tight line-clamp-2">{game.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-700">💡 If a game doesn't load in frame, click ↗ to open in a new tab · 🚨 to exit instantly</p>
        </div>
      </div>

      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-center gap-1">
        <button onClick={onLogout}
          className="w-12 h-12 bg-red-600 text-white rounded-full shadow-lg shadow-red-600/30 hover:bg-red-700 transition-all flex items-center justify-center text-xl hover:scale-110 active:scale-95"
          title="PANIC - Quick exit to math site">🚨</button>
        <span className="text-[9px] text-gray-700">Exit</span>
      </div>
    </div>
  );
}
