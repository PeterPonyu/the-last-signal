# The Last Signal

An original golden fantasy browser adventure starring Zeyu, Dawnweaver and Sol.

[Play the game](https://peterponyu.github.io/the-last-signal/)

Free browser play, with no account or installation. Five connected maps (the Sunken Garden, Echo Causeway, Hollow Sun Court, Emberfoundry and Starfall Observatory) offer defeat-driven story progression, two branching roads each with a protected keeper mission, a roaming champion and a final Warden: ten named boss encounters, fifteen named keepers and fifteen regional enemy types alongside the common Hollow. The extended campaign targets roughly 25–35 minutes; duration depends on difficulty, route, upgrades and retries. Fight with automatic ranged light, Sunblade, Sunbreak, Guardian Pulse and Solar Lance; Dawnweaver learns Lunar Nova and Sol gains Comet Volley. The first three maps use painted raster artwork; the Emberfoundry and Starfall Observatory enemies and bosses are stylised illustrations drawn in code, all with distinct anticipation, impact, recovery and fallen poses. Automatic combat powers are enabled by default and can be disabled in pause settings. Escort and repair NPCs fight and have health; if captured, they return to their starting road after three seconds, and pressing F there restarts that mission. Dawnweaver heals nearby allies, Sol wards them, and E shields active keepers.

Move with WASD or arrows. J or click swings Sunblade; Q releases Sunbreak; E pulses; Space dashes; F speaks, chooses a road or enters a gateway. Ranged light fires automatically. P or Escape pauses. Touch controls are included, and instructions can be hidden.

This repository contains the deployable game, including its JavaScript runtime source in app/ and content/. Serve the directory through any static HTTP server to play locally. Open index.html through HTTP rather than directly from the filesystem, because the game loads ES modules and an asset catalog.

The main character and companion are illustrated fictional adaptations. Character bodies, environment paintings and radiance atlases are original raster artwork: generated for the first three maps, and drawn procedurally in code for the Emberfoundry and Starfall Observatory enemies and bosses. Clear danger outlines, interface symbols and lightweight particles are rendered in code. Reference photographs and private development records are not included. The original live score is synthesized in the browser and is off until enabled.

The game runs locally in the browser. Last results and instruction preferences use browser storage. Active journeys and cloud saves are not supported. The wider six-chapter story remains future content.
