# 5000-vscode-themes-youtube

Source code for the "**[5000 VS Code themes](https://youtu.be/fcVTjNu-xqw)**" YouTube video

## What’s inside

- **Part 1** - Environment setup

  - `.devcontainer` - The VS Code dev container configuration.
  - `setup.sh` - Script that should be run after the dev container is up and running.
  - `fonts.conf` - The fontconfig file to customize the system fonts.

- **Part 2** - Capturing VS Code screenshots

  - `theme-list.tsv` - The list of themes to capture.
  - `enqueue.mjs` - Enqueues all themes from the list to Azure Storage Queue.
  - `clearQueue.mjs` - Clears the processing queue from Azure Storage Queue.
  - `capture.mjs` - The worker code.
  - `capture-worker.sh` - The script to run the worker code in a loop.

- **Part 3** - Video rendering

  - `render-server.sh` - Starts the web server that serves the files. Other commands depends on this server.
  - `animation.html` - The code used to generate the animation from the rendered images.
  - `data/vscode-themes.json` - The list of themes to render (for demo purposes, only 16 themes are included here).
  - `data/bgm.m4a` - Background music (a short demo track is provided here instead of the real one).
  - `data/extensions/*` - The images rendered from part 2.
  - `cover.html` - The code used to generate the cover image.
