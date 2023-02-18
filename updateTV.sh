#!/bin/bash

node /Users/west/Public/m3u8/api/update.js

git -C /Users/west/Public/m3u8 add /Users/west/Public/m3u8/public/west.m3u

git -C /Users/west/Public/m3u8 commit -m "update"

git -C /Users/west/Public/m3u8 push
