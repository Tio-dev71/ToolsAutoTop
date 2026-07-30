const { v4: uuidv4 } = require('uuid');

class AutomationEngine {
  constructor(browserManager, db) {
    this.browserManager = browserManager;
    this.db = db;
    this.runningTasks = new Set();
  }

  listTasks() {
    return this.db.listTasks().map(t => ({
      ...t,
      profile_ids: JSON.parse(t.profile_ids || '[]'),
      config: JSON.parse(t.config || '{}')
    }));
  }

  createTask(data) {
    const id = uuidv4();
    return this.db.createTask({ ...data, id });
  }

  deleteTask(id) {
    this.stopTask(id);
    return this.db.deleteTask(id);
  }

  async startTask(id) {
    if (this.runningTasks.has(id)) {
      throw new Error('Task is already running');
    }

    const tasks = this.listTasks();
    const task = tasks.find(t => t.id === id);
    if (!task) throw new Error('Task not found');

    this.runningTasks.add(id);
    this.db.updateTask(id, { status: 'running', last_run: new Date().toISOString() });
    
    // Fire and forget execution
    this._executeTask(task).catch(err => {
      console.error(`Task ${id} error:`, err);
    }).finally(() => {
      this.runningTasks.delete(id);
      this.db.updateTask(id, { status: 'idle' });
    });

    return { success: true };
  }

  stopTask(id) {
    if (this.runningTasks.has(id)) {
      // In a real implementation we would need a cancellation token
      this.runningTasks.delete(id);
      this.db.updateTask(id, { status: 'idle' });
    }
    return { success: true };
  }

  getTaskLogs(taskId) {
    return this.db.getTaskLogs(taskId);
  }

  _log(taskId, profileId, action, result, message) {
    this.db.addTaskLog({ task_id: taskId, profile_id: profileId, action, result, message });
  }

  async _executeTask(task) {
    for (const profileId of task.profile_ids) {
      if (!this.runningTasks.has(task.id)) break; // Task was stopped

      this._log(task.id, profileId, 'start', 'pending', `Starting task for profile ${profileId}`);

      try {
        let page = this.browserManager.getPage(profileId);
        
        // If browser is not running, launch it
        if (!page) {
           this._log(task.id, profileId, 'launch', 'pending', 'Launching browser...');
           await this.browserManager.launch(profileId);
           // wait a bit
           await new Promise(r => setTimeout(r, 2000));
           page = this.browserManager.getPage(profileId);
        }

        if (!page) throw new Error('Failed to get page instance');

        // Execute specific task type
        switch (task.type) {
          case 'fb_auto_like':
            await this._taskFbAutoLike(task.id, profileId, page, task.config);
            break;
          case 'fb_auto_post':
             await this._taskFbAutoPost(task.id, profileId, page, task.config);
             break;
          case 'fb_farm_reels':
             await this._taskFbFarmReels(task, profileId, page, task.config);
             break;
          case 'fb_auto_interact':
             await this._taskFbAutoInteract(task, profileId, page, task.config);
             break;
          case 'fb_add_friends_group':
             await this._taskFbAddFriendsGroup(task, profileId, page, task.config);
             break;
          case 'fb_invite_to_group':
             await this._taskFbInviteToGroup(task, profileId, page, task.config);
             break;
          default:
            throw new Error(`Unknown task type: ${task.type}`);
        }

        this._log(task.id, profileId, 'complete', 'success', 'Task finished successfully');

      } catch (err) {
        this._log(task.id, profileId, 'error', 'failed', err.message);
      }
    }
  }

  // --- Task Implementations ---

  async _humanScroll(page, scrolls = 3) {
    for (let i = 0; i < scrolls; i++) {
      const distance = 300 + Math.random() * 500;
      const chunks = 15;
      const step = distance / chunks;
      
      // Smooth scroll simulation
      for (let j = 0; j < chunks; j++) {
        await page.mouse.wheel({ deltaY: step });
        await new Promise(r => setTimeout(r, 20 + Math.random() * 20));
      }
      
      // Randomly scroll up slightly
      if (Math.random() > 0.8) {
        await page.mouse.wheel({ deltaY: -200 });
      }
      
      await new Promise(r => setTimeout(r, 1500 + Math.random() * 2000));
    }
  }

  async _randomInteract(task, profileId, page, config, chance = 0.3) {
    const action = Math.random();
    if (action > chance) return;

    const isLike = Math.random() < 0.6; // 60% to like, 40% to comment

    if (isLike) {
       this._log(task.id, profileId, 'action', 'pending', 'Liking a post/reel');
       await page.evaluate(() => {
         function isVisible(el) {
           const rect = el.getBoundingClientRect();
           return rect.top >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight);
         }
         const likes = Array.from(document.querySelectorAll('div[aria-label="Thích"], div[aria-label="Like"], div[aria-label="Bày tỏ cảm xúc"], div[aria-label="Thích bài viết"]')).filter(isVisible);
         if (likes.length > 0) {
           likes[Math.floor(Math.random() * likes.length)].click();
         }
       });
       await new Promise(r => setTimeout(r, 2000));
    } else if (config.comments && config.comments.length > 0) {
       this._log(task.id, profileId, 'action', 'pending', 'Commenting on a post/reel');
       const comment = config.comments[Math.floor(Math.random() * config.comments.length)];
       
       const clicked = await page.evaluate(() => {
         function isVisible(el) {
           const rect = el.getBoundingClientRect();
           return rect.top >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight);
         }
         const btns = Array.from(document.querySelectorAll('div[aria-label="Bình luận"], div[aria-label="Comment"], div[aria-label="Viết bình luận"]')).filter(isVisible);
         if (btns.length > 0) {
           btns[Math.floor(Math.random() * btns.length)].click();
           return true;
         }
         return false;
       });
       
       if (clicked) {
         await new Promise(r => setTimeout(r, 3000)); 
         
         await page.evaluate(() => {
           const box = document.querySelector('form[action*="/comment/"] textarea, form div[contenteditable="true"], div[aria-label="Viết bình luận"], div[aria-label="Write a comment"]');
           if (box) box.focus();
         });
         
         await page.keyboard.type(comment, { delay: 50 });
         await new Promise(r => setTimeout(r, 500));
         await page.keyboard.press('Enter');
         
         await new Promise(r => setTimeout(r, 3000));
         await page.keyboard.press('Escape');
         await new Promise(r => setTimeout(r, 1000));
       }
    }
  }

  async _taskFbFarmReels(task, profileId, page, config) {
      let reelsUrl = config.targetUrl || 'https://www.facebook.com/reels/';
      
      // --- MODE 1: General Reels ---
      if (!config.targetUrl) {
         this._log(task.id, profileId, 'action', 'pending', `Farming general reels`);
         await page.goto(reelsUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
         await new Promise(r => setTimeout(r, 5000));
         
         // Try to click first reel
         await page.evaluate(() => {
           const reel = document.querySelector('a[href*="/reel/"]');
           if (reel) reel.click();
         });
         await new Promise(r => setTimeout(r, 5000));
         
         for(let i = 0; i < config.actionCount; i++) {
           if (!this.runningTasks.has(task.id)) break;
           this._log(task.id, profileId, 'action', 'pending', `Watching reel ${i+1}/${config.actionCount}`);
           
           // Watch for 10-25 seconds
           await new Promise(r => setTimeout(r, 10000 + Math.random() * 15000));
           
           // Occasionally like/comment
           await this._randomInteract(task, profileId, page, config, 0.2); // 20% chance
           
           // Randomly scroll up
           if (Math.random() > 0.8 && i > 0) {
              await page.keyboard.press('ArrowUp');
           } else {
              await page.keyboard.press('ArrowDown');
           }
           await new Promise(r => setTimeout(r, 2000));
         }
         return;
      }
      
      // --- MODE 2: Fanpage Specific Reels ---
      if (!reelsUrl.endsWith('/reels/') && !reelsUrl.endsWith('/reels')) {
        reelsUrl = reelsUrl.replace(/\/$/, '') + '/reels/';
      }

      this._log(task.id, profileId, 'action', 'pending', `Farming fanpage reels at ${reelsUrl}`);
      
      for(let i = 0; i < config.actionCount; i++) {
        if (!this.runningTasks.has(task.id)) break;
        
        // Always go back to the fanpage's reels grid to ensure we don't fall into the generic algorithm feed
        await page.goto(reelsUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await new Promise(r => setTimeout(r, 4000));
        
        // Scroll down so the i-th reel is loaded in DOM
        if (i > 4) {
          await this._humanScroll(page, Math.floor(i / 4));
        }

        const clicked = await page.evaluate((index) => {
           const reels = Array.from(document.querySelectorAll('a[href*="/reel/"]'));
           if (reels.length > index) {
             reels[index].click();
             return true;
           } else if (reels.length > 0) {
             reels[Math.floor(Math.random() * reels.length)].click(); // fallback
             return true;
           }
           return false;
        }, i);

        if (clicked) {
           this._log(task.id, profileId, 'action', 'pending', `Watching fanpage reel ${i+1}/${config.actionCount}`);
           // Watch for 10-25 seconds
           await new Promise(r => setTimeout(r, 10000 + Math.random() * 15000));
           
           // Occasionally like/comment
           await this._randomInteract(task, profileId, page, config, 0.2); // 20% chance
        } else {
           this._log(task.id, profileId, 'error', 'failed', `Could not find reel ${i+1}`);
           break; 
        }
      }
  }

  async _taskFbAutoInteract(task, profileId, page, config) {
      const targetUrl = config.targetUrl || 'https://www.facebook.com/';
      this._log(task.id, profileId, 'action', 'pending', `Farming feed at ${targetUrl}`);
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await new Promise(r => setTimeout(r, 4000));

      for(let i = 0; i < config.actionCount; i++) {
        if (!this.runningTasks.has(task.id)) break;
        this._log(task.id, profileId, 'action', 'pending', `Scrolling feed ${i+1}/${config.actionCount}`);
        
        // Scroll down to load and see new posts
        await this._humanScroll(page, 2);
        
        // Randomly like or comment (higher chance than reels)
        await this._randomInteract(task, profileId, page, config, 0.4); // 40% chance
      }
  }

  async _taskFbAddFriendsGroup(task, profileId, page, config) {
    let url = config.targetUrl;
    if (!url || !url.includes('facebook.com/groups/')) {
      throw new Error('Target URL is missing or not a valid Facebook Group URL');
    }
    
    if (!url.includes('/members')) {
      if (url.endsWith('/')) url += 'members';
      else url += '/members';
    }

    this._log(task.id, profileId, 'action', 'pending', `Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000 + Math.random() * 2000));

    let addedCount = 0;
    let scrollAttempts = 0;

    while (addedCount < config.actionCount && scrollAttempts < 20) {
      // Find "Add friend" buttons
      const addBtns = await page.locator('div[aria-label="Thêm bạn bè"], div[aria-label="Add friend"], span:has-text("Thêm bạn bè"), span:has-text("Add friend")');
      const count = await addBtns.count();

      let clickedInThisPass = false;
      for (let i = 0; i < count; i++) {
        if (addedCount >= config.actionCount) break;
        try {
          const btn = addBtns.nth(i);
          if (await btn.isVisible()) {
            await btn.click();
            addedCount++;
            clickedInThisPass = true;
            this._log(task.id, profileId, 'action', 'success', `Sent friend request ${addedCount}/${config.actionCount}`);
            // Wait 3 to 8 seconds to mimic human
            await new Promise(r => setTimeout(r, 3000 + Math.random() * 5000));
          }
        } catch (e) {
          // Button might have disappeared or detached
        }
      }

      if (!clickedInThisPass) {
        await this._humanScroll(page, 2);
        scrollAttempts++;
      }
    }
    
    this._log(task.id, profileId, 'complete', 'success', `Finished adding ${addedCount} friends.`);
  }

  async _taskFbInviteToGroup(task, profileId, page, config) {
    let url = config.targetUrl;
    if (!url || !url.includes('facebook.com/groups/')) {
      throw new Error('Target URL is missing or not a valid Facebook Group URL');
    }

    this._log(task.id, profileId, 'action', 'pending', `Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000 + Math.random() * 2000));

    // Try to find the "Invite" button on the group page
    const inviteBtn = await page.locator('div[aria-label="Mời"], div[aria-label="Invite"], span:has-text("Mời"), span:has-text("Invite")').first();
    if (await inviteBtn.isVisible()) {
      await inviteBtn.click();
      this._log(task.id, profileId, 'action', 'pending', 'Opened Invite dialog');
      await new Promise(r => setTimeout(r, 3000));
      
      // Sometimes it opens a submenu "Mời bạn bè trên Facebook", we might need to click it
      const inviteFbFriends = await page.locator('span:has-text("Mời bạn bè trên Facebook"), span:has-text("Invite Facebook friends")').first();
      if (await inviteFbFriends.isVisible()) {
        await inviteFbFriends.click();
        await new Promise(r => setTimeout(r, 3000));
      }

      // Now we are in the dialog with a list of friends and checkboxes
      let invitedCount = 0;
      let scrollAttempts = 0;
      
      while (invitedCount < config.actionCount && scrollAttempts < 15) {
        // Find checkboxes
        const checkboxes = await page.locator('input[type="checkbox"]');
        const count = await checkboxes.count();
        let clickedInThisPass = false;

        for (let i = 0; i < count; i++) {
          if (invitedCount >= config.actionCount) break;
          try {
            const cb = checkboxes.nth(i);
            const isChecked = await cb.isChecked().catch(() => true); // if error, assume checked to skip
            if (await cb.isVisible() && !isChecked) {
              await cb.click();
              invitedCount++;
              clickedInThisPass = true;
              this._log(task.id, profileId, 'action', 'success', `Selected friend ${invitedCount}/${config.actionCount}`);
              await new Promise(r => setTimeout(r, 1000 + Math.random() * 1500));
            }
          } catch (e) {
            // ignore
          }
        }

        if (!clickedInThisPass) {
          // Try scrolling the dialog. It's tricky to scroll a specific div, so we'll simulate mouse wheel
          await page.mouse.wheel({ deltaY: 500 });
          await new Promise(r => setTimeout(r, 2000));
          scrollAttempts++;
        }
      }

      // Click "Send Invites" button
      const sendBtn = await page.locator('div[aria-label="Gửi lời mời"], div[aria-label="Send Invites"], span:has-text("Gửi lời mời")').first();
      if (await sendBtn.isVisible()) {
        await sendBtn.click();
        this._log(task.id, profileId, 'action', 'success', `Sent invites to ${invitedCount} friends.`);
        await new Promise(r => setTimeout(r, 3000));
      } else {
        this._log(task.id, profileId, 'error', 'failed', 'Could not find Send button');
      }

    } else {
      throw new Error('Could not find the Invite button on the group page');
    }
  }

  async _taskFbAutoLike(taskId, profileId, page, config) {
    this._log(taskId, profileId, 'action', 'pending', 'Navigating to Facebook feed...');
    await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Simple sleep to mimic human
    await new Promise(r => setTimeout(r, 3000));
    
    this._log(taskId, profileId, 'action', 'pending', `Attempting to like ${config.count || 5} posts...`);
    // Here we would actually use puppeteer to find like buttons and click them
    await new Promise(r => setTimeout(r, 5000)); 
  }

  async _taskFbAutoPost(taskId, profileId, page, config) {
     this._log(taskId, profileId, 'action', 'pending', 'Navigating to page/group...');
     // Here we would use puppeteer to post content
     await new Promise(r => setTimeout(r, 5000));
  }
}

module.exports = { AutomationEngine };
