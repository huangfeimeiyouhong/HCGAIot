#!/bin/bash
# 把 template*.html + echarts.min.js + china/fujian.geo.js 合成单文件 HTML
set -e
cd "$(dirname "$0")"

build_one () {
  local tpl="$1" out="$2"
  /Users/phil/.workbuddy/binaries/python/versions/3.13.12/bin/python3 - "$tpl" "$out" <<'EOF'
import sys, os
tpl, out = sys.argv[1], sys.argv[2]
html = open(tpl, encoding="utf-8").read()
ech = open("echarts.min.js", encoding="utf-8").read()
geo = open("china.geo.js", encoding="utf-8").read() + "\n" + open("fujian.geo.js", encoding="utf-8").read()
html = html.replace("/*__ECHARTS__*/", ech).replace("/*__GEOJSON__*/", geo)
open(out, "w", encoding="utf-8").write(html)
print(f"生成 {out}  {os.path.getsize(out)/1024/1024:.2f} MB")
EOF
}

# ① 设备/终端视角（原交付物，保留）
build_one template.html            "后厨管家-IoT设备全景监控大屏.html"
# ② 平台运营视角（本次新增：平台方/管理侧总览）
build_one template-platform.html   "后厨管家-AIoT平台运营全景监控大屏.html"
