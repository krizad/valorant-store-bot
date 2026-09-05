/**
 * Renders the responsive HTML for the Valorant Store Check Web Authentication Portal
 */
export function renderWebPortalHtml({ session, publicUrl = "" }) {
    const riotAuthUrl = "https://auth.riotgames.com/authorize?redirect_uri=https%3A%2F%2Fplayvalorant.com%2Fopt_in&client_id=play-valorant-web-prod&response_type=token%20id_token&scope=account%20openid&nonce=1";
    
    // Bookmarklet code that grabs the access_token/id_token from the URL or ssid cookie
    const bookmarkletScript = `javascript:(function(){try{var href=window.location.href;if(href.indexOf('access_token=')!==-1){window.location.href='${publicUrl}/auth/login?token=${session.token}&redirect_url='+encodeURIComponent(href);return;}var c=document.cookie.match(/(?:^|;\\s*)ssid=([^;]*)/);if(c&&c[1]){window.location.href='${publicUrl}/auth/login?token=${session.token}&ssid='+encodeURIComponent(c[1]);return;}if(href.indexOf('/auth/login')!==-1||href.indexOf('localhost')!==-1){alert('กรุณากดเปิดหน้าล็อกอิน Riot (ขั้นตอนที่ 1) ก่อน แล้วพอล็อกอินเสร็จจนเจอหน้า 404 ให้คลิกบุ๊กมาร์กนี้ครับ');}else{alert('ไม่พบโทเคนการล็อกอิน กรุณาล็อกอิน Riot ให้เสร็จจนขึ้นหน้า 404 หรือหน้าเว็บ แล้วจึงกดบุ๊กมาร์กนี้อีกครั้ง');}}catch(e){alert('เกิดข้อผิดพลาด: '+e.message);}})();`;

    return `<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Valorant Store Check — Web Login</title>
    <style>
        :root {
            --bg-base: #0f1923;
            --bg-card: #1b2733;
            --bg-card-hover: #223242;
            --val-red: #ff4655;
            --val-red-hover: #fa4454;
            --text-primary: #ece8e1;
            --text-secondary: #9aa8b5;
            --border-color: rgba(255, 255, 255, 0.08);
            --success-color: #00eb9c;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
        }

        body {
            background-color: var(--bg-base);
            color: var(--text-primary);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .container {
            width: 100%;
            max-width: 540px;
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 16px 36px rgba(0, 0, 0, 0.4);
            position: relative;
        }

        .header-bar {
            height: 6px;
            background: var(--val-red);
            width: 100%;
        }

        .content {
            padding: 32px 28px;
        }

        .brand {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 24px;
        }

        .brand-icon {
            width: 36px;
            height: 36px;
            background: var(--val-red);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 900;
            font-size: 20px;
            color: #fff;
        }

        .brand-title {
            font-size: 20px;
            font-weight: 700;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }

        .user-badge {
            display: flex;
            align-items: center;
            gap: 12px;
            background: rgba(15, 25, 35, 0.6);
            border: 1px solid var(--border-color);
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 24px;
        }

        .user-avatar {
            width: 38px;
            height: 38px;
            border-radius: 50%;
            background: #2b3846;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            font-weight: bold;
        }

        .user-info .user-name {
            font-size: 15px;
            font-weight: 600;
        }

        .user-info .user-hint {
            font-size: 12px;
            color: var(--text-secondary);
        }

        .step-card {
            background: rgba(15, 25, 35, 0.4);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 18px;
            margin-bottom: 16px;
        }

        .step-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 12px;
        }

        .step-num {
            background: var(--val-red);
            color: #fff;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            font-weight: bold;
        }

        .step-title {
            font-size: 15px;
            font-weight: 600;
        }

        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            width: 100%;
            padding: 12px 18px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;
        }

        .btn-riot {
            background: #ea323c;
            color: #fff;
        }
        .btn-riot:hover {
            background: #d82a33;
        }

        .btn-submit {
            background: var(--val-red);
            color: #fff;
            margin-top: 10px;
        }
        .btn-submit:hover:not(:disabled) {
            background: var(--val-red-hover);
        }
        .btn-submit:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .bookmarklet-box {
            background: rgba(0, 0, 0, 0.2);
            border: 1px dashed var(--border-color);
            padding: 12px;
            border-radius: 6px;
            margin-top: 10px;
            text-align: center;
        }

        .bookmarklet-btn {
            display: inline-block;
            background: #36495a;
            color: #fff;
            padding: 6px 14px;
            border-radius: 4px;
            font-size: 12px;
            text-decoration: none;
            font-weight: bold;
            cursor: grab;
            margin-top: 6px;
        }

        .bookmarklet-hint {
            font-size: 12px;
            color: var(--text-secondary);
            margin-top: 4px;
        }

        .input-group {
            margin-top: 12px;
        }

        .input-field {
            width: 100%;
            padding: 12px;
            background: rgba(15, 25, 35, 0.8);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            color: #fff;
            font-size: 13px;
            outline: none;
            transition: border-color 0.2s;
            resize: vertical;
            min-height: 70px;
        }

        .input-field:focus {
            border-color: var(--val-red);
        }

        .status-msg {
            margin-top: 14px;
            padding: 12px;
            border-radius: 6px;
            font-size: 13px;
            display: none;
            text-align: center;
        }

        .status-error {
            display: block;
            background: rgba(255, 70, 85, 0.15);
            border: 1px solid var(--val-red);
            color: #ff9da5;
        }

        .status-loading {
            display: block;
            background: rgba(54, 73, 90, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #b2c2d2;
        }

        /* Success screen */
        .success-view {
            display: none;
            text-align: center;
            padding: 24px 10px;
        }

        .success-icon {
            width: 64px;
            height: 64px;
            background: rgba(0, 235, 156, 0.15);
            border: 2px solid var(--success-color);
            color: var(--success-color);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            margin: 0 auto 16px;
        }

        .success-title {
            font-size: 22px;
            font-weight: 700;
            color: var(--success-color);
            margin-bottom: 8px;
        }

        .account-badge {
            display: inline-block;
            background: rgba(15, 25, 35, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.12);
            padding: 8px 18px;
            border-radius: 20px;
            font-size: 16px;
            font-weight: bold;
            color: #fff;
            margin: 12px 0 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header-bar"></div>
        <div class="content">
            <div class="brand">
                <div class="brand-icon">V</div>
                <div class="brand-title">Valorant Store Login</div>
            </div>

            <div class="user-badge">
                <div class="user-avatar">${session.userTag ? session.userTag.charAt(0).toUpperCase() : 'U'}</div>
                <div class="user-info">
                    <div class="user-name">${escapeHtml(session.userTag || 'Discord User')}</div>
                    <div class="user-hint">กำลังเชื่อมต่อบัญชีเข้ากับ Discord ID: ${session.userId}</div>
                </div>
            </div>

            <!-- Login Form Area -->
            <div id="login-flow">
                <!-- Step 1 -->
                <div class="step-card">
                    <div class="step-header">
                        <div class="step-num">1</div>
                        <div class="step-title">เข้าสู่ระบบบัญชี Riot Games</div>
                    </div>
                    <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;">
                        คลิกปุ่มด้านล่างเพื่อเปิดหน้าล็อกอินทางการของ Riot Games ในแท็บใหม่
                    </p>
                    <a href="${riotAuthUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-riot">
                        🔑 เปิดหน้าล็อกอิน Riot Games
                    </a>
                </div>

                <!-- Step 2 -->
                <div class="step-card">
                    <div class="step-header">
                        <div class="step-num">2</div>
                        <div class="step-title">ส่งเซสชันกลับมาที่ระบบ</div>
                    </div>
                    
                    <div style="background: rgba(255, 70, 85, 0.12); border-left: 3px solid var(--val-red); padding: 10px 14px; border-radius: 6px; margin-bottom: 14px; font-size: 13px; line-height: 1.5; color: #ece8e1;">
                        💡 <b>ข้อควรทราบ:</b> เมื่อล็อกอิน Riot เสร็จแล้ว เว็บไซต์อาจแสดงหน้า <code>404 PAGE NOT FOUND</code> <b>ถือว่าล็อกอินสำเร็จเรียบร้อยแล้วครับ!</b><br>
                        เพียงกดคลิก Bookmarklet หรือก๊อปปี้ลิงก์ URL ในช่องค้นหา (Address Bar) ทั้งหมดของหน้านั้น มาวางในช่องด้านล่างนี้ได้ทันที
                    </div>

                    <!-- 1-Click Helper Bookmarklet -->
                    <div class="bookmarklet-box">
                        <p style="font-size: 12px; font-weight: 600; color: #ece8e1;">⚡ วิธีคลิกเดียว (Bookmarklet):</p>
                        <p class="bookmarklet-hint">ลากปุ่มนี้ไปไว้ที่แถบบุ๊กมาร์ก (Bookmarks Bar) ของ Chrome ➔ พอล็อกอินหน้า Riot เสร็จ (เจอหน้า 404) ให้คลิกบุ๊กมาร์กนี้ 1 ครั้ง</p>
                        <a href="${bookmarkletScript}" class="bookmarklet-btn">⚡ ส่ง Session ให้บอท</a>
                    </div>

                    <div class="input-group">
                        <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">
                            หรือวางค่า URL หน้า 404 (มี access_token) หรือ <code>ssid</code> cookie:
                        </p>
                        <textarea id="cookie-input" class="input-field" placeholder="วาง URL หน้า 404 (ที่มี access_token) หรือค่า ssid cookie ที่นี่..."></textarea>
                        <button id="submit-btn" class="btn btn-submit">🚀 ยืนยันและเชื่อมต่อบัญชี</button>
                    </div>
                </div>

                <div id="status-box" class="status-msg"></div>
            </div>

            <!-- Success Area -->
            <div id="success-flow" class="success-view">
                <div class="success-icon">✓</div>
                <div class="success-title">เชื่อมต่อบัญชีสำเร็จ!</div>
                <p style="font-size: 14px; color: var(--text-secondary);">เข้าสู่ระบบ Valorant เรียบร้อยแล้วในชื่อ:</p>
                <div id="riot-username" class="account-badge">Loading...</div>
                <p style="font-size: 13px; color: #a2b2c2; line-height: 1.6;">
                    คุณสามารถปิดแท็บนี้ และกลับไปที่ห้องแชต Discord<br>เพื่อใช้คำสั่ง <b>/shop</b> ตรวจสอบร้านค้าประจำวันได้ทันที 🎉
                </p>
            </div>
        </div>
    </div>

    <script>
        const token = "${session.token}";
        const cookieInput = document.getElementById("cookie-input");
        const submitBtn = document.getElementById("submit-btn");
        const statusBox = document.getElementById("status-box");
        const loginFlow = document.getElementById("login-flow");
        const successFlow = document.getElementById("success-flow");
        const riotUsernameEl = document.getElementById("riot-username");

        // Check if redirect_url or ssid parameter exists in current URL query (auto-filled via Bookmarklet)
        const urlParams = new URLSearchParams(window.location.search);
        const autoRedirectUrl = urlParams.get("redirect_url");
        const autoSsid = urlParams.get("ssid");
        if (autoRedirectUrl) {
            cookieInput.value = autoRedirectUrl;
            submitSession(autoRedirectUrl);
        } else if (autoSsid) {
            cookieInput.value = autoSsid;
            submitSession(autoSsid);
        }

        submitBtn.addEventListener("click", () => {
            const val = cookieInput.value.trim();
            if (!val) {
                showError("กรุณากรอก ssid cookie หรือ URL หน้าล็อกอิน");
                return;
            }
            submitSession(val);
        });

        async function submitSession(rawCookie) {
            submitBtn.disabled = true;
            showLoading("⏳ กำลังตรวจสอบและเชื่อมต่อกับ Riot Games...");

            try {
                const res = await fetch("/api/auth/submit", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token: token, cookies: rawCookie })
                });

                const data = await res.json();
                if (res.ok && data.success) {
                    showSuccess(data.username);
                } else {
                    submitBtn.disabled = false;
                    showError(data.error || "เชื่อมต่อไม่สำเร็จ กรุณาตรวจสอบว่าคุกกี้ถูกต้องและยังไม่หมดอายุ");
                }
            } catch (err) {
                submitBtn.disabled = false;
                showError("เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย: " + err.message);
            }
        }

        function showLoading(msg) {
            statusBox.className = "status-msg status-loading";
            statusBox.textContent = msg;
        }

        function showError(msg) {
            statusBox.className = "status-msg status-error";
            statusBox.textContent = msg;
        }

        function showSuccess(username) {
            loginFlow.style.display = "none";
            successFlow.style.display = "block";
            riotUsernameEl.textContent = username || "VALORANT Player";
        }
    </script>
</body>
</html>`;
}

/**
 * Renders an error page when token is invalid or expired
 */
export function renderExpiredOrInvalidHtml(errorMessage = "ลิงก์เข้าสู่ระบบหมดอายุหรือไม่ถูกต้อง") {
    return `<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Session Expired — Valorant Store Check</title>
    <style>
        body {
            background-color: #0f1923;
            color: #ece8e1;
            font-family: 'Segoe UI', -apple-system, sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .card {
            max-width: 440px;
            background: #1b2733;
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 12px;
            padding: 32px 24px;
            text-align: center;
            box-shadow: 0 16px 36px rgba(0,0,0,0.4);
        }
        .icon {
            font-size: 48px;
            margin-bottom: 16px;
        }
        h2 {
            font-size: 20px;
            color: #ff4655;
            margin-bottom: 10px;
        }
        p {
            font-size: 14px;
            color: #9aa8b5;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">⚠️</div>
        <h2>${escapeHtml(errorMessage)}</h2>
        <p>
            ลิงก์เข้าสู่ระบบนี้อาจหมดอายุแล้ว (อายุการใช้งาน 10 นาที) หรือถูกใช้งานไปแล้ว<br><br>
            กรุณากลับไปที่ Discord แล้วพิมพ์คำสั่ง <b>/login</b> ใหม่อีกครั้งครับ
        </p>
    </div>
</body>
</html>`;
}

function escapeHtml(text) {
    if (!text) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
