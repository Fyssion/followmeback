function listenForClicks() {
    document.addEventListener("click", async (e) => {
        if (e.target.tagName !== "BUTTON" || !e.target.closest("#followmeback")) {
            return;
        }

        try {
            const tabs = await browser.tabs.query({active: true, currentWindow: true});
            const tab = tabs[0];

            if (e.target.id === "detectFollowers") {
                await browser.tabs.sendMessage(tab.id, {
                    command: "scrape-followers"
                });
            } else {
                await browser.tabs.sendMessage(tab.id, {
                    command: "scrape-following"
                });
            }
        } catch (error) {
            console.error(`Could not run: ${error}`);
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


async function checkIfInstagram() {
    const tabs = await browser.tabs.query({active: true, currentWindow: true});
    const tab = tabs[0];
    const isInstagram = tab.url.includes("instagram.com");
    const state = await getState();
    state.isInstagram = isInstagram;
    await setState(state);
    await updateUI(state);
}


document.addEventListener('DOMContentLoaded', async () => {
    try {
        await checkIfInstagram();
    } catch (error) {
        console.error('Error during initialization:', error);
        await updateUI(await getState());
    }
});

(async () => {
    console.log('Here');
    let tabs = await browser.tabs.query({active: true, currentWindow: true});
    let tab = tabs[0];
    console.log(tabs, tab);
    try {
        await browser.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["/vendor/browser-polyfill.js"],
        });
        await browser.scripting.executeScript({
            target:  { tabId: tab.id },
            files: ["/content_script.js"],
        });
        listenForClicks();
    } catch (e) {
        reportExecuteScriptError(true, e);
    }
})();
