目前遇到服務一直掛掉

Monitor is DOWN: 產品前端feat branch ( <https://app-feat.daodao.so/> ) - Reason: HTTP 520 - CloudFlare Timeout
島島阿學
「島島阿學」盼能透過建立多元的學習資源網絡，讓自主學習者能找到合適的成長方法，進一步成為自己想成為的人，從中培養共好精神。目前正積極打造「可共編的學習資源平台」。
Monitor is UP: 島島後端 API 文件 ( <https://server.daodao.so/api/docs/> ). It was down for 5 minutes and 4 seconds.
Monitor is UP:  API DB Info ( <https://server.daodao.so/api/v1/db-info> ). It was down for 25 minutes and 26 seconds.
Monitor is DOWN: 產品前端dev branch ( <https://app-dev.daodao.so/> ) - Reason: HTTP 520 - CloudFlare Timeout
島島阿學
「島島阿學」盼能透過建立多元的學習資源網絡，讓自主學習者能找到合適的成長方法，進一步成為自己想成為的人，從中培養共好精神。目前正積極打造「可共編的學習資源平台」。
Monitor is UP: 正式環境 DB ( <https://server.daodao.so/db-info.html> ). It was down for 10 minutes and 10 seconds.
UptimeRobot
應用
 — 上午10:22
Monitor is UP: 產品前端prod branch ( <https://www.daodao.so/> ). It was down for 15 minutes and 16 seconds.
島島阿學
「島島阿學」盼能透過建立多元的學習資源網絡，讓自主學習者能找到合適的成長方法，進一步成為自己想成為的人，從中培養共好精神。目前正積極打造「可共編的學習資源平台」。
Monitor is DOWN: 系統狀態摘要 ( <https://server.daodao.so/api/v1/monitor> ) - Reason: HTTP 520 - CloudFlare Timeout
Monitor is UP: 產品前端feat branch ( <https://app-feat.daodao.so/> ). It was down for 15 minutes and 14 seconds.
島島阿學
「島島阿學」盼能透過建立多元的學習資源網絡，讓自主學習者能找到合適的成長方法，進一步成為自己想成為的人，從中培養共好精神。目前正積極打造「可共編的學習資源平台」。
Monitor is UP: 產品前端dev branch ( <https://app-dev.daodao.so/> ). It was down for 15 minutes and 15 seconds.
島島阿學
「島島阿學」盼能透過建立多元的學習資源網絡，讓自主學習者能找到合適的成長方法，進一步成為自己想成為的人，從中培養共好精神。目前正積極打造「可共編的學習資源平台」。
Monitor is DOWN: 正式環境 DB ( <https://server.daodao.so/db-info.html> ) - Reason: HTTP 520 - CloudFlare Timeout
Monitor is UP: 系統狀態摘要 ( <https://server.daodao.so/api/v1/monitor> ). It was down for 5 minutes and 5 seconds.
UptimeRobot
應用
 — 上午10:30
Monitor is DOWN: 產品前端feat branch ( <https://app-feat.daodao.so/> ) - Reason: HTTP 520 - CloudFlare Timeout
島島阿學
「島島阿學」盼能透過建立多元的學習資源網絡，讓自主學習者能找到合適的成長方法，進一步成為自己想成為的人，從中培養共好精神。目前正積極打造「可共編的學習資源平台」。
Monitor is UP: 正式環境 DB ( <https://server.daodao.so/db-info.html> ). It was down for 5 minutes and 4 seconds.
Monitor is DOWN:  API DB Info ( <https://server.daodao.so/api/v1/db-info> ) - Reason: HTTP 520 - CloudFlare Timeout
Monitor is DOWN: 系統狀態摘要 ( <https://server.daodao.so/api/v1/monitor> ) - Reason: HTTP 520 - CloudFlare Timeout
UptimeRobot
應用
 — 上午10:39
Monitor is DOWN: 產品前端dev branch ( <https://app-dev.daodao.so/> ) - Reason: HTTP 520 - CloudFlare Timeout
島島阿學
「島島阿學」盼能透過建立多元的學習資源網絡，讓自主學習者能找到合適的成長方法，進一步成為自己想成為的人，從中培養共好精神。目前正積極打造「可共編的學習資源平台」。
Monitor is UP: 產品前端feat branch ( <https://app-feat.daodao.so/> ). It was down for 10 minutes and 10 seconds.
島島阿學
「島島阿學」盼能透過建立多元的學習資源網絡，讓自主學習者能找到合適的成長方法，進一步成為自己想成為的人，從中培養共好精神。目前正積極打造「可共編的學習資源平台」。
Monitor is DOWN: 島島後端 API 文件 ( <https://server.daodao.so/api/docs/> ) - Reason: HTTP 520 - CloudFlare Timeout
Monitor is UP:  API DB Info ( <https://server.daodao.so/api/v1/db-info> ). It was down for 10 minutes and 11 seconds.
Monitor is UP: 系統狀態摘要 ( <https://server.daodao.so/api/v1/monitor> ). It was down for 10 minutes and 10 seconds.
Monitor is DOWN: 產品前端prod branch ( <https://www.daodao.so/> ) - Reason: HTTP 520 - CloudFlare Timeout

root@localhost:~# docker logs nginx --tail 200
2026/03/17 03:13:54 [error] 25#25: daodao-status could not be resolved (2: Server failure)
2026/03/17 03:13:54 [error] 25#25: daodao-admin could not be resolved (2: Server failure)
2026/03/17 03:13:54 [error] 25#25: n8n could not be resolved (2: Server failure)
2026/03/17 03:13:54 [error] 25#25: daodao-blog could not be resolved (2: Server failure)
2a06:98c0:3600::103 - - [17/Mar/2026:03:13:56 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026/03/17 03:13:56 [warn] 25#25: *25 an upstream response is buffered to a temporary file /var/cache/nginx/proxy_temp/1/00/0000000001 while reading upstream, client: 203.69.216.172, server: daodao.so, request: "GET /assets/landing-page/key-vision-mobile.json HTTP/1.1", upstream: "<http://172.21.0.7:3000/assets/landing-page/key-vision-mobile.json>", host: "daodao.so", referrer: "<https://daodao.so/>"
203.69.216.172 - - [17/Mar/2026:03:13:56 +0000] "GET /assets/landing-page/logo-action.json HTTP/1.1" 200 5421 "<https://daodao.so/>" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36" "203.69.216.172"
203.69.216.172 - - [17/Mar/2026:03:13:56 +0000] "GET /assets/landing-page/key-vision-mobile.json HTTP/1.1" 200 2101198 "<https://daodao.so/>" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36" "203.69.216.172"
203.69.216.172 - - [17/Mar/2026:03:13:57 +0000] "GET /assets/landing-page/key-vision-desktop.json HTTP/1.1" 200 214031 "<https://daodao.so/>" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36" "203.69.216.172"
203.69.216.172 - - [17/Mar/2026:03:14:00 +0000] "GET /api/v1/practices/templates?limit=3 HTTP/1.1" 200 1820 "<https://daodao.so/>" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36" "203.69.216.172"
203.69.216.172 - - [17/Mar/2026:03:14:01 +0000] "GET /api/v1/users?page=1&pageSize=1 HTTP/1.1" 200 3472 "<https://daodao.so/>" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36" "203.69.216.172"
203.69.216.172 - - [17/Mar/2026:03:14:01 +0000] "GET /api/v1/auth/me HTTP/1.1" 401 198 "<https://daodao.so/>" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36" "203.69.216.172"
203.69.216.172 - - [17/Mar/2026:03:14:03 +0000] "POST /api/v1/auth/refresh HTTP/1.1" 401 198 "<https://daodao.so/>" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36" "203.69.216.172"
2a06:98c0:3600::103 - - [17/Mar/2026:03:14:06 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2a06:98c0:3600::103 - - [17/Mar/2026:03:14:06 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2a06:98c0:3600::103 - - [17/Mar/2026:03:14:17 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2a06:98c0:3600::103 - - [17/Mar/2026:03:14:19 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026/03/17 03:14:24 [error] 25#25: backend-prod could not be resolved (2: Server failure)
2026/03/17 03:14:24 [error] 25#25: daodao-blog could not be resolved (2: Server failure)
2026/03/17 03:14:24 [error] 25#25: daodao-admin could not be resolved (2: Server failure)
2026/03/17 03:14:24 [error] 25#25: daodao-docs could not be resolved (2: Server failure)
2026/03/17 03:14:24 [error] 25#25: daodao-status could not be resolved (2: Server failure)
2026/03/17 03:14:24 [error] 25#25: n8n could not be resolved (2: Server failure)
2a06:98c0:3600::103 - - [17/Mar/2026:03:14:30 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2a06:98c0:3600::103 - - [17/Mar/2026:03:14:41 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2a06:98c0:3600::103 - - [17/Mar/2026:03:14:42 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2a06:98c0:3600::103 - - [17/Mar/2026:03:14:53 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026/03/17 03:14:54 [error] 25#25: daodao-status could not be resolved (2: Server failure)
2026/03/17 03:14:54 [error] 25#25: daodao-blog could not be resolved (2: Server failure)
2026/03/17 03:14:54 [error] 25#25: n8n could not be resolved (2: Server failure)
2026/03/17 03:14:54 [error] 25#25: daodao-admin could not be resolved (2: Server failure)
2026/03/17 03:14:54 [error] 25#25: backend-prod could not be resolved (2: Server failure)
2026/03/17 03:14:54 [error] 25#25: daodao-docs could not be resolved (2: Server failure)
2a06:98c0:3600::103 - - [17/Mar/2026:03:14:56 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2a06:98c0:3600::103 - - [17/Mar/2026:03:14:57 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2a06:98c0:3600::103 - - [17/Mar/2026:03:15:13 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107653 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026/03/17 03:15:24 [error] 25#25: daodao-docs could not be resolved (2: Server failure)
2026/03/17 03:15:24 [error] 25#25: n8n could not be resolved (2: Server failure)
2026/03/17 03:15:24 [error] 25#25: daodao-admin could not be resolved (2: Server failure)
2026/03/17 03:15:24 [error] 25#25: backend-prod could not be resolved (2: Server failure)
2026/03/17 03:15:24 [error] 25#25: daodao-status could not be resolved (2: Server failure)
2026/03/17 03:15:24 [error] 25#25: daodao-blog could not be resolved (2: Server failure)
2a06:98c0:3600::103 - - [17/Mar/2026:03:15:28 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2a06:98c0:3600::103 - - [17/Mar/2026:03:15:30 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2a06:98c0:3600::103 - - [17/Mar/2026:03:15:46 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
5.161.75.7 - - [17/Mar/2026:03:15:50 +0000] "HEAD /db-info.html HTTP/1.1" 200 0 "<https://server.daodao.so/db-info.html>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "5.161.75.7"
5.161.75.7 - - [17/Mar/2026:03:15:51 +0000] "HEAD / HTTP/1.1" 301 0 "<https://www.daodao.so>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "5.161.75.7"
5.161.75.7 - - [17/Mar/2026:03:15:51 +0000] "HEAD / HTTP/1.1" 200 0 "<https://www.daodao.so>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "5.161.75.7"
2026/03/17 03:15:54 [error] 25#25: daodao-status could not be resolved (2: Server failure)
2026/03/17 03:15:54 [error] 25#25: backend-prod could not be resolved (2: Server failure)
2026/03/17 03:15:54 [error] 25#25: daodao-admin could not be resolved (2: Server failure)
2026/03/17 03:15:54 [error] 25#25: n8n could not be resolved (2: Server failure)
2026/03/17 03:15:54 [error] 25#25: daodao-blog could not be resolved (2: Server failure)
2026/03/17 03:15:54 [error] 25#25: daodao-docs could not be resolved (2: Server failure)
3.12.251.153 - - [17/Mar/2026:03:15:55 +0000] "HEAD /api/v1/db-info HTTP/1.1" 499 0 "<https://server.daodao.so/api/v1/db-info>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "3.12.251.153"
2a06:98c0:3600::103 - - [17/Mar/2026:03:15:59 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2a06:98c0:3600::103 - - [17/Mar/2026:03:16:00 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2a06:98c0:3600::103 - - [17/Mar/2026:03:16:14 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
3.149.57.90 - - [17/Mar/2026:03:16:15 +0000] "HEAD / HTTP/1.1" 307 0 "<https://app-dev.daodao.so>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "3.149.57.90"
3.149.57.90 - - [17/Mar/2026:03:16:16 +0000] "HEAD /en HTTP/1.1" 200 0 "<https://app-dev.daodao.so>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "3.149.57.90"
5.161.177.47 - - [17/Mar/2026:03:16:21 +0000] "HEAD /api/v1/db-info HTTP/1.1" 200 0 "<https://server.daodao.so/api/v1/db-info>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "5.161.177.47"
2026/03/17 03:16:24 [error] 25#25: backend-prod could not be resolved (2: Server failure)
2026/03/17 03:16:24 [error] 25#25: n8n could not be resolved (2: Server failure)
2026/03/17 03:16:24 [error] 25#25: daodao-docs could not be resolved (2: Server failure)
2026/03/17 03:16:24 [error] 25#25: daodao-status could not be resolved (2: Server failure)
2026/03/17 03:16:24 [error] 25#25: daodao-admin could not be resolved (2: Server failure)
2026/03/17 03:16:24 [error] 25#25: daodao-blog could not be resolved (2: Server failure)
2a06:98c0:3600::103 - - [17/Mar/2026:03:16:25 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2a06:98c0:3600::103 - - [17/Mar/2026:03:16:27 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
3.12.251.153 - - [17/Mar/2026:03:16:34 +0000] "HEAD /api/v1/monitor HTTP/1.1" 200 0 "<https://server.daodao.so/api/v1/monitor>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "3.12.251.153"
2a06:98c0:3600::103 - - [17/Mar/2026:03:16:38 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
216.144.248.27 - - [17/Mar/2026:03:16:41 +0000] "HEAD / HTTP/1.1" 307 0 "<https://app-dev.daodao.so>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "216.144.248.27"
2a06:98c0:3600::103 - - [17/Mar/2026:03:16:48 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2a06:98c0:3600::103 - - [17/Mar/2026:03:16:49 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
185.191.171.11 - - [17/Mar/2026:03:16:54 +0000] "GET /resource/categories/education_learning/undefined/secondary_education/learning_science/adult_education/early_childhood_education/early_childhood_education HTTP/1.1" 200 107645 "-" "Mozilla/5.0 (compatible; SemrushBot/7~bl; +<http://www.semrush.com/bot.html>)" "185.191.171.11"
2026/03/17 03:16:54 [error] 25#25: backend-prod could not be resolved (2: Server failure)
2026/03/17 03:16:54 [error] 25#25: n8n could not be resolved (2: Server failure)
2026/03/17 03:16:54 [error] 25#25: daodao-blog could not be resolved (2: Server failure)
2026/03/17 03:16:54 [error] 25#25: daodao-status could not be resolved (2: Server failure)
2026/03/17 03:16:54 [error] 25#25: daodao-docs could not be resolved (2: Server failure)
2026/03/17 03:16:54 [error] 25#25: daodao-admin could not be resolved (2: Server failure)
66.249.66.204 - - [17/Mar/2026:03:16:56 +0000] "GET /resource/b_56eR5pmu6IiH5Lq65paH5pWZ6IKy5YWl5Y-j57ay HTTP/1.1" 200 107645 "-" "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.159 Mobile Safari/537.36 (compatible; Googlebot/2.1; +<http://www.google.com/bot.html>)" "66.249.66.204"
216.144.248.27 - - [17/Mar/2026:03:17:00 +0000] "HEAD /api/v1/monitor HTTP/1.1" 200 0 "<https://server.daodao.so/api/v1/monitor>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "216.144.248.27"
2a06:98c0:3600::103 - - [17/Mar/2026:03:17:00 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026/03/17 03:17:00 [warn] 25#25:*56 an upstream response is buffered to a temporary file /var/cache/nginx/proxy_temp/2/00/0000000002 while reading upstream, client: 66.249.66.192, server: daodao.so, request: "GET /assets/landing-page/key-vision-mobile.json HTTP/1.1", upstream: "<http://172.21.0.7:3000/assets/landing-page/key-vision-mobile.json>", host: "daodao.so", referrer: "<https://daodao.so/resource/b_56eR5pmu6IiH5Lq65paH5pWZ6IKy5YWl5Y-j57ay>"
66.249.66.192 - - [17/Mar/2026:03:17:02 +0000] "GET /assets/landing-page/key-vision-mobile.json HTTP/1.1" 200 2101125 "<https://daodao.so/resource/b_56eR5pmu6IiH5Lq65paH5pWZ6IKy5YWl5Y-j57ay>" "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.159 Mobile Safari/537.36 (compatible; Googlebot/2.1; +<http://www.google.com/bot.html>)" "66.249.66.192"
34.198.201.66 - - [17/Mar/2026:03:17:07 +0000] "HEAD / HTTP/1.1" 307 0 "<https://app-dev.daodao.so>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "34.198.201.66"
34.198.201.66 - - [17/Mar/2026:03:17:07 +0000] "HEAD /en HTTP/1.1" 200 0 "<https://app-dev.daodao.so>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "34.198.201.66"
2a06:98c0:3600::103 - - [17/Mar/2026:03:17:11 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
17.241.227.79 - - [17/Mar/2026:03:17:17 +0000] "GET /en/resource/%E5%85%8D%E8%B2%BB%E8%B3%87%E6%BA%90%E7%B6%B2%E8%B7%AF%E7%A4%BE%E7%BE%A4 HTTP/1.1" 200 95063 "-" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15 (Applebot/0.1; +<http://www.apple.com/go/applebot>)" "17.241.227.79"
2a06:98c0:3600::103 - - [17/Mar/2026:03:17:21 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2a06:98c0:3600::103 - - [17/Mar/2026:03:17:21 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
178.156.189.113 - - [17/Mar/2026:03:17:21 +0000] "HEAD / HTTP/1.1" 307 0 "<https://app-feat.daodao.so>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "178.156.189.113"
34.198.201.66 - - [17/Mar/2026:03:17:23 +0000] "HEAD /api/v1/monitor HTTP/1.1" 200 0 "<https://server.daodao.so/api/v1/monitor>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "34.198.201.66"
35.227.62.178 - - [17/Mar/2026:03:17:24 +0000] "GET /api/v1/monitor HTTP/1.1" 200 6055 "-" "Mozilla/5.0 (compatible; Discordbot/2.0; +<https://discordapp.com>)" "35.227.62.178"
2026/03/17 03:17:24 [error] 25#25: backend-prod could not be resolved (2: Server failure)
2026/03/17 03:17:24 [error] 25#25: daodao-admin could not be resolved (2: Server failure)
2026/03/17 03:17:24 [error] 25#25: n8n could not be resolved (2: Server failure)
2026/03/17 03:17:24 [error] 25#25: daodao-status could not be resolved (2: Server failure)
2026/03/17 03:17:24 [error] 25#25: daodao-blog could not be resolved (2: Server failure)
2026/03/17 03:17:24 [error] 25#25: daodao-docs could not be resolved (2: Server failure)
2a06:98c0:3600::103 - - [17/Mar/2026:03:17:32 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2a06:98c0:3600::103 - - [17/Mar/2026:03:17:32 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2401:e180:88ec:4332:3d07:ef34:6b62:5aad - - [17/Mar/2026:03:17:33 +0000] "GET /api/v1/monitor HTTP/1.1" 200 6055 "-" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36" "2401:e180:88ec:4332:3d07:ef34:6b62:5aad"
203.69.216.172 - - [17/Mar/2026:03:17:33 +0000] "GET /about.txt?_rsc=3tegh HTTP/1.1" 200 4280 "<https://daodao.so/>" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36" "203.69.216.172"
203.69.216.172 - - [17/Mar/2026:03:17:33 +0000] "GET /about HTTP/1.1" 200 97280 "<https://daodao.so/>" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36" "203.69.216.172"
203.69.216.172 - - [17/Mar/2026:03:17:33 +0000] "GET /_next/static/chunks/app/%5Blocale%5D/(with-layout)/about/page-26a94bc44ef3785d.js HTTP/1.1" 200 934 "<https://daodao.so/about>" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36" "203.69.216.172"
2026/03/17 03:17:33 [warn] 25#25: *54 an upstream response is buffered to a temporary file /var/cache/nginx/proxy_temp/3/00/0000000003 while reading upstream, client: 203.69.216.172, server: daodao.so, request: "GET /assets/about/about.png HTTP/1.1", upstream: "<http://172.21.0.7:3000/assets/about/about.png>", host: "daodao.so", referrer: "<https://daodao.so/about>"
203.69.216.172 - - [17/Mar/2026:03:17:33 +0000] "GET /assets/about/about.png HTTP/1.1" 200 4600591 "<https://daodao.so/about>" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36" "203.69.216.172"
203.69.216.172 - - [17/Mar/2026:03:17:33 +0000] "GET /api/v1/auth/me HTTP/1.1" 401 198 "<https://daodao.so/>" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36" "203.69.216.172"
203.69.216.172 - - [17/Mar/2026:03:17:34 +0000] "POST /api/v1/auth/refresh HTTP/1.1" 401 198 "<https://daodao.so/>" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36" "203.69.216.172"
5.161.75.7 - - [17/Mar/2026:03:17:38 +0000] "HEAD /docs HTTP/1.1" 200 0 "<https://ai-dev.daodao.so/docs>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "5.161.75.7"
17.22.253.199 - - [17/Mar/2026:03:17:41 +0000] "GET /zh-TW/resource/%E5%AD%B8%E7%BF%92%E5%AE%B6%E5%B0%8F%E7%BE%8A HTTP/1.1" 200 107645 "-" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15 (Applebot/0.1; +<http://www.apple.com/go/applebot>)" "17.22.253.199"
2a06:98c0:3600::103 - - [17/Mar/2026:03:17:43 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2a06:98c0:3600::103 - - [17/Mar/2026:03:17:45 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2a06:98c0:3600::103 - - [17/Mar/2026:03:17:47 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026/03/17 03:17:55 [error] 25#25: daodao-blog could not be resolved (2: Server failure)
2026/03/17 03:17:55 [error] 25#25: n8n could not be resolved (2: Server failure)
2026/03/17 03:17:55 [error] 25#25: daodao-admin could not be resolved (2: Server failure)
2026/03/17 03:17:55 [error] 25#25: backend-prod could not be resolved (2: Server failure)
2026/03/17 03:17:55 [error] 25#25: daodao-docs could not be resolved (2: Server failure)
2026/03/17 03:17:55 [error] 25#25: daodao-status could not be resolved (2: Server failure)
2a06:98c0:3600::103 - - [17/Mar/2026:03:18:02 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107652 "-" "Next.js Middleware" "2a06:98c0:3600::103"
18.116.205.62 - - [17/Mar/2026:03:18:03 +0000] "HEAD /docs HTTP/1.1" 200 0 "<https://ai-dev.daodao.so/docs>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "18.116.205.62"
2a06:98c0:3600::103 - - [17/Mar/2026:03:18:05 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2a06:98c0:3600::103 - - [17/Mar/2026:03:18:07 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2a06:98c0:3600::103 - - [17/Mar/2026:03:18:24 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026/03/17 03:18:25 [error] 25#25: daodao-blog could not be resolved (2: Server failure)
2026/03/17 03:18:25 [error] 25#25: backend-prod could not be resolved (2: Server failure)
2026/03/17 03:18:25 [error] 25#25: daodao-admin could not be resolved (2: Server failure)
2026/03/17 03:18:25 [error] 25#25: n8n could not be resolved (2: Server failure)
2026/03/17 03:18:25 [error] 25#25: daodao-status could not be resolved (2: Server failure)
2026/03/17 03:18:25 [error] 25#25: daodao-docs could not be resolved (2: Server failure)
2a06:98c0:3600::103 - - [17/Mar/2026:03:18:26 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
178.156.189.113 - - [17/Mar/2026:03:18:34 +0000] "HEAD /api/docs/ HTTP/1.1" 200 0 "<https://server.daodao.so/api/docs/>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "178.156.189.113"
35.227.62.178 - - [17/Mar/2026:03:18:35 +0000] "GET /api/docs/ HTTP/1.1" 200 3082 "-" "Mozilla/5.0 (compatible; Discordbot/2.0; +<https://discordapp.com>)" "35.227.62.178"
85.208.96.195 - - [17/Mar/2026:03:18:42 +0000] "GET /%E8%87%BA%E6%9D%B1%E7%B8%A3%E9%87%91%E5%B3%B0%E9%84%89%E6%96%B0%E8%88%88%E5%9C%8B%E5%B0%8F--%E7%9F%AD%E6%9C%9F%E4%BB%A3%E8%AA%B2%E6%95%99%E5%B8%AB HTTP/1.1" 200 107645 "-" "Mozilla/5.0 (compatible; SemrushBot/7~bl; +<http://www.semrush.com/bot.html>)" "85.208.96.195"
2a06:98c0:3600::103 - - [17/Mar/2026:03:18:42 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2a06:98c0:3600::103 - - [17/Mar/2026:03:18:44 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026/03/17 03:18:55 [error] 25#25: daodao-blog could not be resolved (2: Server failure)
2026/03/17 03:18:55 [error] 25#25: daodao-docs could not be resolved (2: Server failure)
2026/03/17 03:18:55 [error] 25#25: backend-prod could not be resolved (2: Server failure)
2026/03/17 03:18:55 [error] 25#25: n8n could not be resolved (2: Server failure)
2026/03/17 03:18:55 [error] 25#25: daodao-status could not be resolved (2: Server failure)
2026/03/17 03:18:55 [error] 25#25: daodao-admin could not be resolved (2: Server failure)
2a06:98c0:3600::103 - - [17/Mar/2026:03:19:02 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2a06:98c0:3600::103 - - [17/Mar/2026:03:19:05 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2a06:98c0:3600::103 - - [17/Mar/2026:03:19:23 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026/03/17 03:19:25 [error] 25#25: daodao-blog could not be resolved (2: Server failure)
2026/03/17 03:19:25 [error] 25#25: n8n could not be resolved (2: Server failure)
2026/03/17 03:19:25 [error] 25#25: backend-prod could not be resolved (2: Server failure)
2026/03/17 03:19:25 [error] 25#25: daodao-status could not be resolved (2: Server failure)
2026/03/17 03:19:25 [error] 25#25: daodao-docs could not be resolved (2: Server failure)
2026/03/17 03:19:25 [error] 25#25: daodao-admin could not be resolved (2: Server failure)
2a06:98c0:3600::103 - - [17/Mar/2026:03:19:38 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2a06:98c0:3600::103 - - [17/Mar/2026:03:19:40 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026/03/17 03:19:55 [error] 25#25: daodao-admin could not be resolved (2: Server failure)
2026/03/17 03:19:55 [error] 25#25: backend-prod could not be resolved (2: Server failure)
2026/03/17 03:19:55 [error] 25#25: daodao-blog could not be resolved (2: Server failure)
2026/03/17 03:19:55 [error] 25#25: daodao-status could not be resolved (2: Server failure)
2026/03/17 03:19:55 [error] 25#25: n8n could not be resolved (2: Server failure)
2026/03/17 03:19:55 [error] 25#25: daodao-docs could not be resolved (2: Server failure)
2a06:98c0:3600::103 - - [17/Mar/2026:03:19:57 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2a06:98c0:3600::103 - - [17/Mar/2026:03:20:01 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2a06:98c0:3600::103 - - [17/Mar/2026:03:20:18 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107637 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026/03/17 03:20:25 [error] 25#25: daodao-status could not be resolved (2: Server failure)
2026/03/17 03:20:25 [error] 25#25: backend-prod could not be resolved (2: Server failure)
2026/03/17 03:20:25 [error] 25#25: daodao-docs could not be resolved (2: Server failure)
2026/03/17 03:20:25 [error] 25#25: daodao-blog could not be resolved (2: Server failure)
2026/03/17 03:20:25 [error] 25#25: daodao-admin could not be resolved (2: Server failure)
2026/03/17 03:20:25 [error] 25#25: n8n could not be resolved (2: Server failure)
2a06:98c0:3600::103 - - [17/Mar/2026:03:20:32 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2a06:98c0:3600::103 - - [17/Mar/2026:03:20:34 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2a06:98c0:3600::103 - - [17/Mar/2026:03:20:36 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
17.241.219.240 - - [17/Mar/2026:03:20:44 +0000] "GET /resource/LearnMode%20%E5%AD%B8%E7%BF%92%E5%90%A7 HTTP/1.1" 200 107645 "-" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15 (Applebot/0.1; +<http://www.apple.com/go/applebot>)" "17.241.219.240"
2a06:98c0:3600::103 - - [17/Mar/2026:03:20:54 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026/03/17 03:20:55 [error] 25#25: backend-prod could not be resolved (2: Server failure)
2026/03/17 03:20:55 [error] 25#25: daodao-admin could not be resolved (2: Server failure)
2026/03/17 03:20:55 [error] 25#25: daodao-status could not be resolved (2: Server failure)
2026/03/17 03:20:55 [error] 25#25: daodao-blog could not be resolved (2: Server failure)
2026/03/17 03:20:55 [error] 25#25: daodao-docs could not be resolved (2: Server failure)
2026/03/17 03:20:55 [error] 25#25: n8n could not be resolved (2: Server failure)
178.156.185.231 - - [17/Mar/2026:03:20:55 +0000] "HEAD / HTTP/1.1" 301 0 "<https://www.daodao.so>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "178.156.185.231"
5.161.61.238 - - [17/Mar/2026:03:20:56 +0000] "HEAD /db-info.html HTTP/1.1" 200 0 "<https://server.daodao.so/db-info.html>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "5.161.61.238"
2a06:98c0:3600::103 - - [17/Mar/2026:03:20:58 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2a06:98c0:3600::103 - - [17/Mar/2026:03:21:01 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
185.191.171.9 - - [17/Mar/2026:03:21:08 +0000] "GET /robots.txt HTTP/1.1" 404 3875 "-" "Mozilla/5.0 (compatible; SemrushBot/7~bl; +<http://www.semrush.com/bot.html>)" "185.191.171.9"
185.191.171.12 - - [17/Mar/2026:03:21:09 +0000] "GET /resource/categories/lifestyle/home_decoration HTTP/1.1" 200 89518 "-" "Mozilla/5.0 (compatible; SemrushBot/7~bl; +<http://www.semrush.com/bot.html>)" "185.191.171.12"
3.20.63.178 - - [17/Mar/2026:03:21:20 +0000] "HEAD / HTTP/1.1" 301 0 "<https://www.daodao.so>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "3.20.63.178"
3.20.63.178 - - [17/Mar/2026:03:21:20 +0000] "HEAD / HTTP/1.1" 200 0 "<https://www.daodao.so>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "3.20.63.178"
2a06:98c0:3600::103 - - [17/Mar/2026:03:21:20 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2a06:98c0:3600::103 - - [17/Mar/2026:03:21:23 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026/03/17 03:21:25 [error] 25#25: daodao-status could not be resolved (2: Server failure)
2026/03/17 03:21:25 [error] 25#25: daodao-admin could not be resolved (2: Server failure)
2026/03/17 03:21:25 [error] 25#25: n8n could not be resolved (2: Server failure)
2026/03/17 03:21:25 [error] 25#25: backend-prod could not be resolved (2: Server failure)
2026/03/17 03:21:25 [error] 25#25: daodao-blog could not be resolved (2: Server failure)
2026/03/17 03:21:25 [error] 25#25: daodao-docs could not be resolved (2: Server failure)
2a06:98c0:3600::103 - - [17/Mar/2026:03:21:25 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
5.161.75.7 - - [17/Mar/2026:03:21:26 +0000] "HEAD /api/v1/db-info HTTP/1.1" 499 0 "<https://server.daodao.so/api/v1/db-info>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "5.161.75.7"
root@localhost:~#

root@localhost:~#  docker inspect nginx --format '
  重啟次數: {{.RestartCount}}
  啟動時間: {{.State.StartedAt}}
  狀態: {{.State.Status}}'

  重啟次數: 0
  啟動時間: 2026-03-17T03:11:24.580336561Z
  狀態: running

root@localhost:~# docker logs nginx --tail 200 --timestamps
2026-03-17T03:14:54.960746772Z 2026/03/17 03:14:54 [error] 25#25: daodao-docs could not be resolved (2: Server failure)
2026-03-17T03:14:56.728494066Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:14:56 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:14:57.761590811Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:14:57 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:15:13.268957796Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:15:13 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107653 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:15:24.965564317Z 2026/03/17 03:15:24 [error] 25#25: daodao-docs could not be resolved (2: Server failure)
2026-03-17T03:15:24.965642347Z 2026/03/17 03:15:24 [error] 25#25: n8n could not be resolved (2: Server failure)
2026-03-17T03:15:24.965650017Z 2026/03/17 03:15:24 [error] 25#25: daodao-admin could not be resolved (2: Server failure)
2026-03-17T03:15:24.965662667Z 2026/03/17 03:15:24 [error] 25#25: backend-prod could not be resolved (2: Server failure)
2026-03-17T03:15:24.965714807Z 2026/03/17 03:15:24 [error] 25#25: daodao-status could not be resolved (2: Server failure)
2026-03-17T03:15:24.965721507Z 2026/03/17 03:15:24 [error] 25#25: daodao-blog could not be resolved (2: Server failure)
2026-03-17T03:15:28.913330065Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:15:28 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:15:30.256944495Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:15:30 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:15:46.542855103Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:15:46 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:15:50.555962283Z 5.161.75.7 - - [17/Mar/2026:03:15:50 +0000] "HEAD /db-info.html HTTP/1.1" 200 0 "<https://server.daodao.so/db-info.html>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "5.161.75.7"
2026-03-17T03:15:51.219914599Z 5.161.75.7 - - [17/Mar/2026:03:15:51 +0000] "HEAD / HTTP/1.1" 301 0 "<https://www.daodao.so>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "5.161.75.7"
2026-03-17T03:15:51.707048249Z 5.161.75.7 - - [17/Mar/2026:03:15:51 +0000] "HEAD / HTTP/1.1" 200 0 "<https://www.daodao.so>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "5.161.75.7"
2026-03-17T03:15:54.989390152Z 2026/03/17 03:15:54 [error] 25#25: daodao-status could not be resolved (2: Server failure)
2026-03-17T03:15:54.989418362Z 2026/03/17 03:15:54 [error] 25#25: backend-prod could not be resolved (2: Server failure)
2026-03-17T03:15:54.989423612Z 2026/03/17 03:15:54 [error] 25#25: daodao-admin could not be resolved (2: Server failure)
2026-03-17T03:15:54.989427982Z 2026/03/17 03:15:54 [error] 25#25: n8n could not be resolved (2: Server failure)
2026-03-17T03:15:54.989431962Z 2026/03/17 03:15:54 [error] 25#25: daodao-blog could not be resolved (2: Server failure)
2026-03-17T03:15:54.989435962Z 2026/03/17 03:15:54 [error] 25#25: daodao-docs could not be resolved (2: Server failure)
2026-03-17T03:15:55.716375099Z 3.12.251.153 - - [17/Mar/2026:03:15:55 +0000] "HEAD /api/v1/db-info HTTP/1.1" 499 0 "<https://server.daodao.so/api/v1/db-info>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "3.12.251.153"
2026-03-17T03:15:59.782545443Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:15:59 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:16:00.683317883Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:16:00 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:16:14.555003994Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:16:14 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:16:15.883086954Z 3.149.57.90 - - [17/Mar/2026:03:16:15 +0000] "HEAD / HTTP/1.1" 307 0 "<https://app-dev.daodao.so>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "3.149.57.90"
2026-03-17T03:16:16.255164289Z 3.149.57.90 - - [17/Mar/2026:03:16:16 +0000] "HEAD /en HTTP/1.1" 200 0 "<https://app-dev.daodao.so>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "3.149.57.90"
2026-03-17T03:16:21.761733807Z 5.161.177.47 - - [17/Mar/2026:03:16:21 +0000] "HEAD /api/v1/db-info HTTP/1.1" 200 0 "<https://server.daodao.so/api/v1/db-info>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "5.161.177.47"
2026-03-17T03:16:24.993146083Z 2026/03/17 03:16:24 [error] 25#25: backend-prod could not be resolved (2: Server failure)
2026-03-17T03:16:24.993171063Z 2026/03/17 03:16:24 [error] 25#25: n8n could not be resolved (2: Server failure)
2026-03-17T03:16:24.993205593Z 2026/03/17 03:16:24 [error] 25#25: daodao-docs could not be resolved (2: Server failure)
2026-03-17T03:16:24.993210403Z 2026/03/17 03:16:24 [error] 25#25: daodao-status could not be resolved (2: Server failure)
2026-03-17T03:16:24.993214403Z 2026/03/17 03:16:24 [error] 25#25: daodao-admin could not be resolved (2: Server failure)
2026-03-17T03:16:24.993218433Z 2026/03/17 03:16:24 [error] 25#25: daodao-blog could not be resolved (2: Server failure)
2026-03-17T03:16:25.950921211Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:16:25 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:16:27.242011819Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:16:27 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:16:34.970694770Z 3.12.251.153 - - [17/Mar/2026:03:16:34 +0000] "HEAD /api/v1/monitor HTTP/1.1" 200 0 "<https://server.daodao.so/api/v1/monitor>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "3.12.251.153"
2026-03-17T03:16:38.963002918Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:16:38 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:16:41.007563668Z 216.144.248.27 - - [17/Mar/2026:03:16:41 +0000] "HEAD / HTTP/1.1" 307 0 "<https://app-dev.daodao.so>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "216.144.248.27"
2026-03-17T03:16:48.836593617Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:16:48 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:16:49.646640563Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:16:49 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:16:54.922733937Z 185.191.171.11 - - [17/Mar/2026:03:16:54 +0000] "GET /resource/categories/education_learning/undefined/secondary_education/learning_science/adult_education/early_childhood_education/early_childhood_education HTTP/1.1" 200 107645 "-" "Mozilla/5.0 (compatible; SemrushBot/7~bl; +<http://www.semrush.com/bot.html>)" "185.191.171.11"
2026-03-17T03:16:54.993877642Z 2026/03/17 03:16:54 [error] 25#25: backend-prod could not be resolved (2: Server failure)
2026-03-17T03:16:54.993906192Z 2026/03/17 03:16:54 [error] 25#25: n8n could not be resolved (2: Server failure)
2026-03-17T03:16:54.993913052Z 2026/03/17 03:16:54 [error] 25#25: daodao-blog could not be resolved (2: Server failure)
2026-03-17T03:16:54.993918652Z 2026/03/17 03:16:54 [error] 25#25: daodao-status could not be resolved (2: Server failure)
2026-03-17T03:16:54.993923992Z 2026/03/17 03:16:54 [error] 25#25: daodao-docs could not be resolved (2: Server failure)
2026-03-17T03:16:54.993929462Z 2026/03/17 03:16:54 [error] 25#25: daodao-admin could not be resolved (2: Server failure)
2026-03-17T03:16:56.748706872Z 66.249.66.204 - - [17/Mar/2026:03:16:56 +0000] "GET /resource/b_56eR5pmu6IiH5Lq65paH5pWZ6IKy5YWl5Y-j57ay HTTP/1.1" 200 107645 "-" "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.159 Mobile Safari/537.36 (compatible; Googlebot/2.1; +<http://www.google.com/bot.html>)" "66.249.66.204"
2026-03-17T03:17:00.218045682Z 216.144.248.27 - - [17/Mar/2026:03:17:00 +0000] "HEAD /api/v1/monitor HTTP/1.1" 200 0 "<https://server.daodao.so/api/v1/monitor>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "216.144.248.27"
2026-03-17T03:17:00.418335610Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:17:00 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:17:00.961891963Z 2026/03/17 03:17:00 [warn] 25#25: *56 an upstream response is buffered to a temporary file /var/cache/nginx/proxy_temp/2/00/0000000002 while reading upstream, client: 66.249.66.192, server: daodao.so, request: "GET /assets/landing-page/key-vision-mobile.json HTTP/1.1", upstream: "<http://172.21.0.7:3000/assets/landing-page/key-vision-mobile.json>", host: "daodao.so", referrer: "<https://daodao.so/resource/b_56eR5pmu6IiH5Lq65paH5pWZ6IKy5YWl5Y-j57ay>"
2026-03-17T03:17:02.382991990Z 66.249.66.192 - - [17/Mar/2026:03:17:02 +0000] "GET /assets/landing-page/key-vision-mobile.json HTTP/1.1" 200 2101125 "<https://daodao.so/resource/b_56eR5pmu6IiH5Lq65paH5pWZ6IKy5YWl5Y-j57ay>" "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.159 Mobile Safari/537.36 (compatible; Googlebot/2.1; +<http://www.google.com/bot.html>)" "66.249.66.192"
2026-03-17T03:17:07.067620456Z 34.198.201.66 - - [17/Mar/2026:03:17:07 +0000] "HEAD / HTTP/1.1" 307 0 "<https://app-dev.daodao.so>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "34.198.201.66"
2026-03-17T03:17:07.288853909Z 34.198.201.66 - - [17/Mar/2026:03:17:07 +0000] "HEAD /en HTTP/1.1" 200 0 "<https://app-dev.daodao.so>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "34.198.201.66"
2026-03-17T03:17:11.098436394Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:17:11 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:17:17.192750320Z 17.241.227.79 - - [17/Mar/2026:03:17:17 +0000] "GET /en/resource/%E5%85%8D%E8%B2%BB%E8%B3%87%E6%BA%90%E7%B6%B2%E8%B7%AF%E7%A4%BE%E7%BE%A4 HTTP/1.1" 200 95063 "-" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15 (Applebot/0.1; +<http://www.apple.com/go/applebot>)" "17.241.227.79"
2026-03-17T03:17:21.188466327Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:17:21 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:17:21.559730825Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:17:21 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:17:21.774901632Z 178.156.189.113 - - [17/Mar/2026:03:17:21 +0000] "HEAD / HTTP/1.1" 307 0 "<https://app-feat.daodao.so>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "178.156.189.113"
2026-03-17T03:17:23.517852620Z 34.198.201.66 - - [17/Mar/2026:03:17:23 +0000] "HEAD /api/v1/monitor HTTP/1.1" 200 0 "<https://server.daodao.so/api/v1/monitor>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "34.198.201.66"
2026-03-17T03:17:24.618308995Z 35.227.62.178 - - [17/Mar/2026:03:17:24 +0000] "GET /api/v1/monitor HTTP/1.1" 200 6055 "-" "Mozilla/5.0 (compatible; Discordbot/2.0; +<https://discordapp.com>)" "35.227.62.178"
2026-03-17T03:17:24.995974287Z 2026/03/17 03:17:24 [error] 25#25: backend-prod could not be resolved (2: Server failure)
2026-03-17T03:17:24.995999907Z 2026/03/17 03:17:24 [error] 25#25: daodao-admin could not be resolved (2: Server failure)
2026-03-17T03:17:24.996005177Z 2026/03/17 03:17:24 [error] 25#25: n8n could not be resolved (2: Server failure)
2026-03-17T03:17:24.996009467Z 2026/03/17 03:17:24 [error] 25#25: daodao-status could not be resolved (2: Server failure)
2026-03-17T03:17:24.996013437Z 2026/03/17 03:17:24 [error] 25#25: daodao-blog could not be resolved (2: Server failure)
2026-03-17T03:17:24.996017447Z 2026/03/17 03:17:24 [error] 25#25: daodao-docs could not be resolved (2: Server failure)
2026-03-17T03:17:32.215469071Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:17:32 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:17:32.833777805Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:17:32 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:17:33.223475005Z 2401:e180:88ec:4332:3d07:ef34:6b62:5aad - - [17/Mar/2026:03:17:33 +0000] "GET /api/v1/monitor HTTP/1.1" 200 6055 "-" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36" "2401:e180:88ec:4332:3d07:ef34:6b62:5aad"
2026-03-17T03:17:33.383077079Z 203.69.216.172 - - [17/Mar/2026:03:17:33 +0000] "GET /about.txt?_rsc=3tegh HTTP/1.1" 200 4280 "<https://daodao.so/>" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36" "203.69.216.172"
2026-03-17T03:17:33.550912915Z 203.69.216.172 - - [17/Mar/2026:03:17:33 +0000] "GET /about HTTP/1.1" 200 97280 "<https://daodao.so/>" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36" "203.69.216.172"
2026-03-17T03:17:33.744252299Z 203.69.216.172 - - [17/Mar/2026:03:17:33 +0000] "GET /_next/static/chunks/app/%5Blocale%5D/(with-layout)/about/page-26a94bc44ef3785d.js HTTP/1.1" 200 934 "<https://daodao.so/about>" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36" "203.69.216.172"
2026-03-17T03:17:33.836487904Z 2026/03/17 03:17:33 [warn] 25#25:*54 an upstream response is buffered to a temporary file /var/cache/nginx/proxy_temp/3/00/0000000003 while reading upstream, client: 203.69.216.172, server: daodao.so, request: "GET /assets/about/about.png HTTP/1.1", upstream: "<http://172.21.0.7:3000/assets/about/about.png>", host: "daodao.so", referrer: "<https://daodao.so/about>"
2026-03-17T03:17:33.881174229Z 203.69.216.172 - - [17/Mar/2026:03:17:33 +0000] "GET /assets/about/about.png HTTP/1.1" 200 4600591 "<https://daodao.so/about>" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36" "203.69.216.172"
2026-03-17T03:17:33.918810164Z 203.69.216.172 - - [17/Mar/2026:03:17:33 +0000] "GET /api/v1/auth/me HTTP/1.1" 401 198 "<https://daodao.so/>" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36" "203.69.216.172"
2026-03-17T03:17:34.076628545Z 203.69.216.172 - - [17/Mar/2026:03:17:34 +0000] "POST /api/v1/auth/refresh HTTP/1.1" 401 198 "<https://daodao.so/>" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36" "203.69.216.172"
2026-03-17T03:17:38.372765788Z 5.161.75.7 - - [17/Mar/2026:03:17:38 +0000] "HEAD /docs HTTP/1.1" 200 0 "<https://ai-dev.daodao.so/docs>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "5.161.75.7"
2026-03-17T03:17:41.398568554Z 17.22.253.199 - - [17/Mar/2026:03:17:41 +0000] "GET /zh-TW/resource/%E5%AD%B8%E7%BF%92%E5%AE%B6%E5%B0%8F%E7%BE%8A HTTP/1.1" 200 107645 "-" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15 (Applebot/0.1; +<http://www.apple.com/go/applebot>)" "17.22.253.199"
2026-03-17T03:17:43.538760233Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:17:43 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:17:45.804746947Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:17:45 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:17:47.899133300Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:17:47 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:17:55.005963618Z 2026/03/17 03:17:55 [error] 25#25: daodao-blog could not be resolved (2: Server failure)
2026-03-17T03:17:55.005998548Z 2026/03/17 03:17:55 [error] 25#25: n8n could not be resolved (2: Server failure)
2026-03-17T03:17:55.006003948Z 2026/03/17 03:17:55 [error] 25#25: daodao-admin could not be resolved (2: Server failure)
2026-03-17T03:17:55.006008218Z 2026/03/17 03:17:55 [error] 25#25: backend-prod could not be resolved (2: Server failure)
2026-03-17T03:17:55.006012198Z 2026/03/17 03:17:55 [error] 25#25: daodao-docs could not be resolved (2: Server failure)
2026-03-17T03:17:55.006016138Z 2026/03/17 03:17:55 [error] 25#25: daodao-status could not be resolved (2: Server failure)
2026-03-17T03:18:02.180297483Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:18:02 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107652 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:18:03.596599056Z 18.116.205.62 - - [17/Mar/2026:03:18:03 +0000] "HEAD /docs HTTP/1.1" 200 0 "<https://ai-dev.daodao.so/docs>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "18.116.205.62"
2026-03-17T03:18:05.781541151Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:18:05 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:18:07.799441701Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:18:07 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:18:24.007794149Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:18:24 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:18:25.007291520Z 2026/03/17 03:18:25 [error] 25#25: daodao-blog could not be resolved (2: Server failure)
2026-03-17T03:18:25.007325610Z 2026/03/17 03:18:25 [error] 25#25: backend-prod could not be resolved (2: Server failure)
2026-03-17T03:18:25.007330860Z 2026/03/17 03:18:25 [error] 25#25: daodao-admin could not be resolved (2: Server failure)
2026-03-17T03:18:25.007335310Z 2026/03/17 03:18:25 [error] 25#25: n8n could not be resolved (2: Server failure)
2026-03-17T03:18:25.007339600Z 2026/03/17 03:18:25 [error] 25#25: daodao-status could not be resolved (2: Server failure)
2026-03-17T03:18:25.007343920Z 2026/03/17 03:18:25 [error] 25#25: daodao-docs could not be resolved (2: Server failure)
2026-03-17T03:18:26.330269337Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:18:26 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:18:34.077962485Z 178.156.189.113 - - [17/Mar/2026:03:18:34 +0000] "HEAD /api/docs/ HTTP/1.1" 200 0 "<https://server.daodao.so/api/docs/>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "178.156.189.113"
2026-03-17T03:18:35.017198995Z 35.227.62.178 - - [17/Mar/2026:03:18:35 +0000] "GET /api/docs/ HTTP/1.1" 200 3082 "-" "Mozilla/5.0 (compatible; Discordbot/2.0; +<https://discordapp.com>)" "35.227.62.178"
2026-03-17T03:18:42.499598452Z 85.208.96.195 - - [17/Mar/2026:03:18:42 +0000] "GET /%E8%87%BA%E6%9D%B1%E7%B8%A3%E9%87%91%E5%B3%B0%E9%84%89%E6%96%B0%E8%88%88%E5%9C%8B%E5%B0%8F--%E7%9F%AD%E6%9C%9F%E4%BB%A3%E8%AA%B2%E6%95%99%E5%B8%AB HTTP/1.1" 200 107645 "-" "Mozilla/5.0 (compatible; SemrushBot/7~bl; +<http://www.semrush.com/bot.html>)" "85.208.96.195"
2026-03-17T03:18:42.681206991Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:18:42 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:18:44.731888175Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:18:44 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:18:55.011957008Z 2026/03/17 03:18:55 [error] 25#25: daodao-blog could not be resolved (2: Server failure)
2026-03-17T03:18:55.011993678Z 2026/03/17 03:18:55 [error] 25#25: daodao-docs could not be resolved (2: Server failure)
2026-03-17T03:18:55.012000358Z 2026/03/17 03:18:55 [error] 25#25: backend-prod could not be resolved (2: Server failure)
2026-03-17T03:18:55.012166859Z 2026/03/17 03:18:55 [error] 25#25: n8n could not be resolved (2: Server failure)
2026-03-17T03:18:55.012175489Z 2026/03/17 03:18:55 [error] 25#25: daodao-status could not be resolved (2: Server failure)
2026-03-17T03:18:55.012179859Z 2026/03/17 03:18:55 [error] 25#25: daodao-admin could not be resolved (2: Server failure)
2026-03-17T03:19:02.039229222Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:19:02 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:19:05.786572936Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:19:05 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:19:23.777800225Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:19:23 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:19:25.025597207Z 2026/03/17 03:19:25 [error] 25#25: daodao-blog could not be resolved (2: Server failure)
2026-03-17T03:19:25.025620347Z 2026/03/17 03:19:25 [error] 25#25: n8n could not be resolved (2: Server failure)
2026-03-17T03:19:25.025654307Z 2026/03/17 03:19:25 [error] 25#25: backend-prod could not be resolved (2: Server failure)
2026-03-17T03:19:25.025659927Z 2026/03/17 03:19:25 [error] 25#25: daodao-status could not be resolved (2: Server failure)
2026-03-17T03:19:25.025664117Z 2026/03/17 03:19:25 [error] 25#25: daodao-docs could not be resolved (2: Server failure)
2026-03-17T03:19:25.025668097Z 2026/03/17 03:19:25 [error] 25#25: daodao-admin could not be resolved (2: Server failure)
2026-03-17T03:19:38.734247488Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:19:38 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:19:40.317244168Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:19:40 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:19:55.033094905Z 2026/03/17 03:19:55 [error] 25#25: daodao-admin could not be resolved (2: Server failure)
2026-03-17T03:19:55.033138535Z 2026/03/17 03:19:55 [error] 25#25: backend-prod could not be resolved (2: Server failure)
2026-03-17T03:19:55.033143855Z 2026/03/17 03:19:55 [error] 25#25: daodao-blog could not be resolved (2: Server failure)
2026-03-17T03:19:55.033148185Z 2026/03/17 03:19:55 [error] 25#25: daodao-status could not be resolved (2: Server failure)
2026-03-17T03:19:55.033158895Z 2026/03/17 03:19:55 [error] 25#25: n8n could not be resolved (2: Server failure)
2026-03-17T03:19:55.033273015Z 2026/03/17 03:19:55 [error] 25#25: daodao-docs could not be resolved (2: Server failure)
2026-03-17T03:19:57.061360730Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:19:57 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:20:01.706390840Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:20:01 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:20:18.461538220Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:20:18 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107637 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:20:25.047043152Z 2026/03/17 03:20:25 [error] 25#25: daodao-status could not be resolved (2: Server failure)
2026-03-17T03:20:25.047085522Z 2026/03/17 03:20:25 [error] 25#25: backend-prod could not be resolved (2: Server failure)
2026-03-17T03:20:25.047094172Z 2026/03/17 03:20:25 [error] 25#25: daodao-docs could not be resolved (2: Server failure)
2026-03-17T03:20:25.047100432Z 2026/03/17 03:20:25 [error] 25#25: daodao-blog could not be resolved (2: Server failure)
2026-03-17T03:20:25.047107532Z 2026/03/17 03:20:25 [error] 25#25: daodao-admin could not be resolved (2: Server failure)
2026-03-17T03:20:25.047135832Z 2026/03/17 03:20:25 [error] 25#25: n8n could not be resolved (2: Server failure)
2026-03-17T03:20:32.808937443Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:20:32 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:20:34.983069558Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:20:34 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:20:36.491962184Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:20:36 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:20:44.852111509Z 17.241.219.240 - - [17/Mar/2026:03:20:44 +0000] "GET /resource/LearnMode%20%E5%AD%B8%E7%BF%92%E5%90%A7 HTTP/1.1" 200 107645 "-" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15 (Applebot/0.1; +<http://www.apple.com/go/applebot>)" "17.241.219.240"
2026-03-17T03:20:54.782342593Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:20:54 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:20:55.059767573Z 2026/03/17 03:20:55 [error] 25#25: backend-prod could not be resolved (2: Server failure)
2026-03-17T03:20:55.059790253Z 2026/03/17 03:20:55 [error] 25#25: daodao-admin could not be resolved (2: Server failure)
2026-03-17T03:20:55.059795473Z 2026/03/17 03:20:55 [error] 25#25: daodao-status could not be resolved (2: Server failure)
2026-03-17T03:20:55.059799863Z 2026/03/17 03:20:55 [error] 25#25: daodao-blog could not be resolved (2: Server failure)
2026-03-17T03:20:55.059803853Z 2026/03/17 03:20:55 [error] 25#25: daodao-docs could not be resolved (2: Server failure)
2026-03-17T03:20:55.059807863Z 2026/03/17 03:20:55 [error] 25#25: n8n could not be resolved (2: Server failure)
2026-03-17T03:20:55.271614490Z 178.156.185.231 - - [17/Mar/2026:03:20:55 +0000] "HEAD / HTTP/1.1" 301 0 "<https://www.daodao.so>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "178.156.185.231"
2026-03-17T03:20:56.430964229Z 5.161.61.238 - - [17/Mar/2026:03:20:56 +0000] "HEAD /db-info.html HTTP/1.1" 200 0 "<https://server.daodao.so/db-info.html>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "5.161.61.238"
2026-03-17T03:20:58.718768142Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:20:58 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:21:01.295153221Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:21:01 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:21:08.081879444Z 185.191.171.9 - - [17/Mar/2026:03:21:08 +0000] "GET /robots.txt HTTP/1.1" 404 3875 "-" "Mozilla/5.0 (compatible; SemrushBot/7~bl; +<http://www.semrush.com/bot.html>)" "185.191.171.9"
2026-03-17T03:21:09.539392973Z 185.191.171.12 - - [17/Mar/2026:03:21:09 +0000] "GET /resource/categories/lifestyle/home_decoration HTTP/1.1" 200 89518 "-" "Mozilla/5.0 (compatible; SemrushBot/7~bl; +<http://www.semrush.com/bot.html>)" "185.191.171.12"
2026-03-17T03:21:20.084774985Z 3.20.63.178 - - [17/Mar/2026:03:21:20 +0000] "HEAD / HTTP/1.1" 301 0 "<https://www.daodao.so>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "3.20.63.178"
2026-03-17T03:21:20.258761074Z 3.20.63.178 - - [17/Mar/2026:03:21:20 +0000] "HEAD / HTTP/1.1" 200 0 "<https://www.daodao.so>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "3.20.63.178"
2026-03-17T03:21:20.880196872Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:21:20 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:21:23.500589097Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:21:23 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:21:25.063054602Z 2026/03/17 03:21:25 [error] 25#25: daodao-status could not be resolved (2: Server failure)
2026-03-17T03:21:25.063080022Z 2026/03/17 03:21:25 [error] 25#25: daodao-admin could not be resolved (2: Server failure)
2026-03-17T03:21:25.063085252Z 2026/03/17 03:21:25 [error] 25#25: n8n could not be resolved (2: Server failure)
2026-03-17T03:21:25.063089652Z 2026/03/17 03:21:25 [error] 25#25: backend-prod could not be resolved (2: Server failure)
2026-03-17T03:21:25.063100072Z 2026/03/17 03:21:25 [error] 25#25: daodao-blog could not be resolved (2: Server failure)
2026-03-17T03:21:25.063176642Z 2026/03/17 03:21:25 [error] 25#25: daodao-docs could not be resolved (2: Server failure)
2026-03-17T03:21:25.283656481Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:21:25 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:21:26.168143896Z 5.161.75.7 - - [17/Mar/2026:03:21:26 +0000] "HEAD /api/v1/db-info HTTP/1.1" 499 0 "<https://server.daodao.so/api/v1/db-info>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "5.161.75.7"
2026-03-17T03:21:45.437072420Z 216.144.248.27 - - [17/Mar/2026:03:21:45 +0000] "HEAD / HTTP/1.1" 301 0 "<https://www.daodao.so>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "216.144.248.27"
2026-03-17T03:21:45.697909527Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:21:45 +0000] "GET /api/v1/resources?majorCategory=education_learni
ng HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:21:45.902477313Z 216.144.248.27 - - [17/Mar/2026:03:21:45 +0000] "HEAD / HTTP/1.1" 200 0 "<https://www.daodao.so>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "216.144.248.27"
2026-03-17T03:21:47.099451507Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:21:47 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:21:50.243377588Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:21:50 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:21:52.026989159Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:21:52 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:21:52.214195929Z 216.144.248.27 - - [17/Mar/2026:03:21:52 +0000] "HEAD /api/v1/db-info HTTP/1.1" 200 0 "<https://server.daodao.so/api/v1/db-info>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "216.144.248.27"
2026-03-17T03:21:55.065593588Z 2026/03/17 03:21:55 [error] 25#25: daodao-admin could not be resolved (2: Server failure)
2026-03-17T03:21:55.065624458Z 2026/03/17 03:21:55 [error] 25#25: n8n could not be resolved (2: Server failure)
2026-03-17T03:21:55.065632178Z 2026/03/17 03:21:55 [error] 25#25: daodao-docs could not be resolved (2: Server failure)
2026-03-17T03:21:55.065638548Z 2026/03/17 03:21:55 [error] 25#25: backend-prod could not be resolved (2: Server failure)
2026-03-17T03:21:55.065644058Z 2026/03/17 03:21:55 [error] 25#25: daodao-status could not be resolved (2: Server failure)
2026-03-17T03:21:55.065649318Z 2026/03/17 03:21:55 [error] 25#25: daodao-blog could not be resolved (2: Server failure)
2026-03-17T03:21:56.389545945Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:21:56 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:22:07.713394563Z 123.58.213.118 - - [17/Mar/2026:03:22:07 +0000] "GET /favicon.ico HTTP/1.1" 404 13221 "<https://www.daoedu.tw/favicon.ico>" "Go-http-client/1.1" "123.58.213.118"
2026-03-17T03:22:07.948286674Z 123.58.213.118 - - [17/Mar/2026:03:22:07 +0000] "GET /sitemap.xml HTTP/1.1" 200 4280 "<https://www.daoedu.tw/sitemap.xml>" "Go-http-client/1.1" "123.58.213.118"
2026-03-17T03:22:08.964043355Z 101.36.112.101 - - [17/Mar/2026:03:22:08 +0000] "GET /sitemap.xml HTTP/1.1" 200 4280 "-" "Go-http-client/1.1" "101.36.112.101"
2026-03-17T03:22:08.965562868Z 101.36.112.101 - - [17/Mar/2026:03:22:08 +0000] "GET /robots.txt HTTP/1.1" 200 4280 "-" "Go-http-client/1.1" "101.36.112.101"
2026-03-17T03:22:09.635018767Z 101.36.112.101 - - [17/Mar/2026:03:22:09 +0000] "GET / HTTP/1.1" 200 107645 "-" "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/583.42 (KHTML, like Gecko) Chrome/64.0.2410 Safari/537.36" "101.36.112.101"
2026-03-17T03:22:11.545745697Z 5.161.61.238 - - [17/Mar/2026:03:22:11 +0000] "HEAD / HTTP/1.1" 307 0 "<https://app-dev.daodao.so>" "Mozilla/5.0+(compatible; UptimeRobot/2.0; <http://www.uptimerobot.com/>)" "5.161.61.238"
2026-03-17T03:22:13.370103890Z 101.36.112.101 - - [17/Mar/2026:03:22:13 +0000] "GET /_next/static/media/favicon.2a32c0cb.png HTTP/1.1" 200 1975 "-" "Go-http-client/1.1" "101.36.112.101"
2026-03-17T03:22:13.518544613Z 101.36.112.101 - - [17/Mar/2026:03:22:13 +0000] "GET /sitemap.xml HTTP/1.1" 200 4280 "-" "Go-http-client/1.1" "101.36.112.101"
2026-03-17T03:22:19.054928549Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:22:19 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:22:21.780277999Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:22:21 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:22:24.689779499Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:22:24 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
2026-03-17T03:22:25.066547140Z 2026/03/17 03:22:25 [error] 25#25: daodao-docs could not be resolved (2: Server failure)
2026-03-17T03:22:25.066591530Z 2026/03/17 03:22:25 [error] 25#25: backend-prod could not be resolved (2: Server failure)
2026-03-17T03:22:25.066599970Z 2026/03/17 03:22:25 [error] 25#25: daodao-blog could not be resolved (2: Server failure)
2026-03-17T03:22:25.066609520Z 2026/03/17 03:22:25 [error] 25#25: daodao-status could not be resolved (2: Server failure)
2026-03-17T03:22:25.066617020Z 2026/03/17 03:22:25 [error] 25#25: daodao-admin could not be resolved (2: Server failure)
2026-03-17T03:22:25.066623760Z 2026/03/17 03:22:25 [error] 25#25: n8n could not be resolved (2: Server failure)
2026-03-17T03:22:27.426629924Z 2a06:98c0:3600::103 - - [17/Mar/2026:03:22:27 +0000] "GET /api/v1/resources?majorCategory=education_learning HTTP/1.1" 200 107645 "-" "Next.js Middleware" "2a06:98c0:3600::103"
root@localhost:~#
