const totp = require('totp-generator');

class FacebookAutomator {
  static async login(page, fbAccount) {
    if (!fbAccount || !fbAccount.uid || !fbAccount.password) {
      return { success: false, error: 'Missing UID or password' };
    }

    try {
      console.log(`[FB Automator] Starting auto-login for UID: ${fbAccount.uid}`);
      
      // Go to Facebook
      await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Check if already logged in by checking if we have the generic Facebook feed or nav
      const isLoggedIn = await page.evaluate(() => {
        return !!document.querySelector('div[role="navigation"]') || !!document.querySelector('form[action*="/search/"]');
      });

      if (isLoggedIn) {
        console.log(`[FB Automator] Already logged in.`);
        return { success: true, status: 'already_logged_in' };
      }

      // Fill in credentials
      const emailSelector = 'input[name="email"], #email';
      const passSelector = 'input[name="pass"], #pass';

      await page.waitForSelector(emailSelector, { timeout: 10000 });
      await page.evaluate((sel, val) => {
        const el = document.querySelector(sel);
        if (el) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, emailSelector, fbAccount.uid);
      
      await page.waitForSelector(passSelector, { timeout: 10000 });
      await page.evaluate((sel, val) => {
        const el = document.querySelector(sel);
        if (el) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, passSelector, fbAccount.password);

      // Wait a tiny bit for React to process
      await new Promise(r => setTimeout(r, 500));

      // Click login button or press Enter
      const loginButton = await page.$('button[name="login"], button[type="submit"]');
      
      if (loginButton) {
        // Use Promise.all to ensure we catch the navigation
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 8000 }).catch(() => {}),
          loginButton.click().catch(async () => {
             // Fallback if covered
             await page.evaluate(b => b.click(), loginButton);
          })
        ]);
      } else {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 8000 }).catch(() => {}),
          page.keyboard.press('Enter')
        ]);
      }

      // Wait for page to settle after multiple redirects
      try {
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 8000 });
      } catch (e) {}
      await new Promise(r => setTimeout(r, 2000));

      // Check for login errors (invalid uid/pass)
      let loginError = false;
      for (let i = 0; i < 3; i++) {
        try {
          loginError = await page.evaluate(() => {
            const text = document.body.innerText.toLowerCase();
            return text.includes('không kết nối với tài khoản nào') || 
                   text.includes('không chính xác') ||
                   text.includes('incorrect') ||
                   text.includes("isn't connected to an account") ||
                   text.includes('find your account and log in');
          });
          break;
        } catch (err) {
          if (err.message.includes('detached Frame') || err.message.includes('destroyed')) {
            await new Promise(r => setTimeout(r, 1500));
          } else {
            break;
          }
        }
      }

      if (loginError) {
        console.log(`[FB Automator] Login failed for UID: ${fbAccount.uid} - Invalid credentials`);
        return { success: false, error: 'Invalid credentials or account disabled' };
      }

      // Check for 2FA screen, retry if frame detaches during further redirects
      let isTwoFactor = false;
      for (let i = 0; i < 3; i++) {
        try {
          isTwoFactor = await page.evaluate(() => {
            return !!document.querySelector('#approvals_code') || document.body.innerText.includes('two-factor authentication') || document.body.innerText.includes('Two-factor authentication required') || document.body.innerText.includes('Nhập mã');
          });
          break;
        } catch (err) {
          if (err.message.includes('detached Frame') || err.message.includes('destroyed')) {
            await new Promise(r => setTimeout(r, 1500));
          } else {
            break;
          }
        }
      }

      if (isTwoFactor) {
        if (!fbAccount.twoFactor) {
          console.log('[FB Automator] 2FA required but no secret provided.');
          return { success: false, error: '2FA required but no secret provided' };
        }

        console.log('[FB Automator] 2FA required. Generating token...');
        const { TOTP } = require('totp-generator');
        const token = TOTP.generate(fbAccount.twoFactor.replace(/\s+/g, '').toUpperCase());
        
        const codeInput = await page.$('#approvals_code');
        if (codeInput) {
          await codeInput.type(token, { delay: 50 });
          
          // Click submit
          const submitCodeBtn = await page.$('#checkpointSubmitButton');
          if (submitCodeBtn) {
            await Promise.all([
              page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 8000 }).catch(() => {}),
              page.evaluate((btn) => btn.click(), submitCodeBtn).catch(() => {})
            ]);
            await new Promise(r => setTimeout(r, 2000));
          }
        }
      }

      // Check for "Save Browser" or "Lưu trình duyệt"
      const saveSelectors = '#checkpointSubmitButton, button[value="OK"], button[name="submit[Continue]"], button[name="name_action_selected"], button[type="submit"]';
      
      // We might need to wait slightly for it to render
      try {
        await page.waitForSelector(saveSelectors, { timeout: 3000 });
        const saveBrowserBtn = await page.$(saveSelectors);
        if (saveBrowserBtn) {
          console.log('[FB Automator] Clicking Save Browser / Continue button...');
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 8000 }).catch(() => {}),
            page.evaluate((btn) => btn.click(), saveBrowserBtn).catch(() => {})
          ]);
        }
      } catch (e) {
        // No save button appeared within 3s, which is fine
        console.log('[FB Automator] No Save Browser prompt detected or clicked.');
      }

      console.log(`[FB Automator] Login flow completed for UID: ${fbAccount.uid}`);
      return { success: true, status: 'logged_in' };

    } catch (err) {
      console.error(`[FB Automator] Error during login:`, err);
      return { success: false, error: err.message };
    }
  }
}

module.exports = { FacebookAutomator };
