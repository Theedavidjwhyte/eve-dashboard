#!/bin/bash
cd /home/user/project/frontend
git commit -m "Initial commit E.V.E Dashboard"
git branch -M main
git remote add origin https://github.com/Theedavidjwhyte/eve-dashboard.git 2>/dev/null || git remote set-url origin https://github.com/Theedavidjwhyte/eve-dashboard.git
git push -u origin main
echo "PUSH_DONE"
