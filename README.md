# PicoAssignment

## Stardew Valley fishing typa game (a draft plan)

Keep track of each others tasks pls:
https://trello.com/invite/b/6ae375cbe03a4f4bcb3d0900/ATTId3050fd7d650792e600aedc3c7837ad79F49D2CD/pico-assignment-tasks

2 actions:

- Casting distance
    - Use button to time it
    - or potentiometer
- Fishing minigame (see pic in this msg)
    - Use potentiometer to move bar to where the fish is
    - Or a button to float it upwards and it float back down

The game loop is js collecting fish:

- Log in / register with RFID card
- Catch a fish (different fish available at different casting distances, random chance of rubbish, random chance of specific fish, time of day?)
- Automatically gets updated in database (Easier to use HTTP than MQTT, but I need to figure out how many resources http will need for this to see tradeoffs)
- Log out automatically at the end ie every time the pico is powered you'll need to use rfid

If OLED screen is viable:

- Use either pixel art or cartoon asset packs (depending on screen's resolution and allat)
- Make the fishing line and float visible, not the rod (and it'll be farther away depending on how you cast it)
- When the float goes down, time it to go to the bar minigame
- Fishing minigame
    - If using cartoon art, use assets for art
    - If using pixel art, if there are no assets availble I could draw it
- Leaderboard of some kind can be easily displayed

If OLED isn't viable:

- Use an LCD screen (also much simpler than oled) and display stuff like "you catched X"
- Have an LED bar, where a light will go up and down and up and down and you time it depending on what catching distance you want (with potentiometer?) and a light shows up at random so you start the minigame
- When there is a fish, there is there can be an led light
- Fishing minigame
    - Idk, figure out how to display the gren bar, the fish, and the progress bar (probably just with led's, but it needs to actually be intuitive)
- Have a website where you can see the leaderboard

Backend: MongoDB + mongoose + node, and RFID module (which should have read and write hopefully) to log in or register

- Account system:
    - Either as a long string of bytes, that way there doesn't need to be user input
    - Or if we have a website showing the leaderboard, that'll be a good opportunity to also have a login screen
- Whose doing what:
    - Probably easiest would be to get together with one doing the coding, and we all participate, instead of each person going and doing their one thing because it'll be difficult to coordinate. In this case, knowing GH isnt neccessary at all, but I'll make a repo anw to backup anything.
    - The problem with this is that coding is time consuming and it would be more efficient for each of us to do their assigned tasks. That way, It won't be just one person doing the majority. This means GH is needed. This also means that each one of us need to put in the work instead of being carried by everyone else. I'd prefer this option, but we can decide later.
