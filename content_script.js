(function() {
    console.log('I am here');

    if (window.hasRun) {
        return;
    }
    window.hasRun = true;

    function scrapeUsernames() {
        let elements = document.querySelectorAll("._ap3a._aaco._aacw._aacx._aad7._aade");
        let usernames = elements.values().map((e) => e.textContent).toArray();
        console.log("usernames");
        console.log(usernames);

        return usernames;
    }

    function scrape(responseCommand) {
        let usernames = scrapeUsernames();

        browser.runtime.sendMessage({
            command: responseCommand,
            usernames: usernames,
        });
    }

    function amInstagram() {
        browser.runtime.sendMessage({
            command: "is-instagram",
            result: document.location.hostname === "www.instagram.com",
        });
    }

    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.command === "scrape-followers") {
            scrape("followers");
        } else if (message.command === "scrape-following") {
            scrape("following");
        } else if (message.command === "am-i-instagram") {
            amInstagram();
        }
    });
})();
