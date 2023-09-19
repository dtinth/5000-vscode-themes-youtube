#!/bin/bash -e

# This script expects `html5-animation-video-renderer` project to be cloned inside this project.
# This script is not meant to be run directly. It is meant to be run by `render-all.mjs`.

cd html5-animation-video-renderer
node render --url='http://localhost:13344/animation.html?render=1' --video=../out/part_$3.mkv --parallelism=1 --start=$1 --end=$2 && echo "done" > ../out/part_$3.done
