/**
 * Listen for clicks on the buttons, and send the appropriate message to
 * the content script in the page.
 */
function listenForClicks() {
    document.addEventListener("click", (e) => {
      function detectFollowers(tabs) {
        browser.tabs.sendMessage(tabs[0].id, {
            command: "scrape-followers",
        });
      }

      function detectFollowing(tabs) {
        browser.tabs.sendMessage(tabs[0].id, {
            command: "scrape-following",
        });
      }

      /**
       * Just log the error to the console.
       */
      function reportError(error) {
        console.error(`Could not run: ${error}`);
      }

      /**
       * Get the active tab,
       */
      if (e.target.tagName !== "BUTTON" || !e.target.closest("#followmeback")) {
        // Ignore when click is not on a button within <div id="followmeback">.
        return;
      }
      if (e.target.id === "detectFollowers") {
        browser.tabs.query({active: true, currentWindow: true})
          .then(detectFollowers)
          .catch(reportError);
      } else {
        browser.tabs.query({active: true, currentWindow: true})
          .then(detectFollowing)
          .catch(reportError);
      }
    });
  }


function reportExecuteScriptError(raise, error) {
    document.querySelector("#followmeback").classList.add("hidden");
    document.querySelector("#followmeback-result").classList.add("hidden");
    document.querySelector("#followmeback-error").classList.remove("hidden");
    if (raise) {
        console.error(`Failed to execute content script: ${error.message}`);
    }
}
function unReportExecuteScriptError() {
    document.querySelector("#followmeback").classList.remove("hidden");
    document.querySelector("#followmeback-result").classList.remove("hidden");
    document.querySelector("#followmeback-error").classList.add("hidden");
}

browser.tabs.executeScript({file: "/vendor/browser-polyfill.js"});
browser.tabs.executeScript({file: "/content_script.js"})
.then(listenForClicks)
.catch((e) => reportExecuteScriptError(true, e));

// async function executeScript() {
//     try {
//         const tabs = await (typeof browser !== 'undefined' ?
//             browser.tabs.executeScript({file: "/content_script.js"}) :
//             new Promise((resolve, reject) => {
//                 chrome.tabs.executeScript({file: "/content_script.js"}, (result) => {
//                     chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve(result);
//                 });
//             })
//         );
//         listenForClicks();
//     } catch (error) {
//         reportExecuteScriptError(error);
//     }
// }

// document.addEventListener('DOMContentLoaded', executeScript);


function updateList(elementId, usernames, defaultText) {
    let list = document.getElementById(elementId);
    while (list.firstChild) {
        list.removeChild(list.lastChild);
      }
    console.log("here, ");
    console.log(list);

    if (usernames.length == 0) {
        list.textContent = defaultText;
    }

    usernames.forEach((username) => {
        const li = document.createElement('li');
        li.textContent = username;
        list.appendChild(li);
    });
}


async function updateUI(state){
    if (!state.isInstagram) {
        reportExecuteScriptError(false);
        return;
    }
    else {
        unReportExecuteScriptError();
    }

    if (state.scrapedFollowers) {
        document.getElementById("detectedFollowers").textContent = state.followers.length;
    }

    if (state.scrapedFollowing) {
        document.getElementById("detectedFollowing").textContent = state.following.length;
    }

    if (state.scrapedFollowers && state.scrapedFollowing) {
        let dontFollowBack = state.following.filter(x => !state.followers.includes(x));
        updateList("noFollowBack", dontFollowBack, "Everyone follows you back!");

        let youDontFollowBack = state.followers.filter(x => !state.following.includes(x));
        updateList("youNoFollowBack", youDontFollowBack, "You follow everyone back!");
    }
}

const INITIAL_STATE = {
    state: {
        followers: [],
        following: [],
        scrapedFollowers: false,
        scrapedFollowing: false,
        isInstagram: false,
    }
};

async function getState() {
    let result = await browser.storage.local.get("state");
    console.log("get state");
    console.log(result);

    if (!result.state) {
        await browser.storage.local.set(INITIAL_STATE);
        return INITIAL_STATE;
    }

    return result.state;
}

async function setState(state) {
    await browser.storage.local.set({state: state});
}

browser.runtime.onMessage.addListener(async (message) => {
    if (message.command === "followers") {
        state = await getState();
        state.followers = message.usernames;
        state.scrapedFollowers = true;
        await setState(state);
        await updateUI(state);
    } else if (message.command === "following") {
        state = await getState();
        state.following = message.usernames;
        state.scrapedFollowing = true;
        await setState(state);
        await updateUI(state);
    } else if (message.command === "is-instagram") {
        state = await getState();
        state.isInstagram = message.result;
        await setState(state);
        await updateUI(state);
    } 
});

document.addEventListener('DOMContentLoaded', async () => {
    let tabs = await browser.tabs.query({active: true, currentWindow: true});
    browser.tabs.sendMessage(tabs[0].id, {
        command: "am-i-instagram",
    });
});
