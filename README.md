glicko
======

Implements glicko-2 rating system along with a ffa-team based setup.

Based on http://www.glicko.net/glicko/glicko2.pdf

Wikipedia description:

The Glicko rating system and Glicko-2 rating system are methods for assessing a player's strength in games of skill, such as chess and go. It was invented by Mark Glickman as an improvement of the Elo rating system, and initially intended for the primary use as a chess rating system. Glickman's principal contribution to measurement is "ratings reliability", called RD, for ratings deviation.

https://en.wikipedia.org/wiki/Glicko_rating_system

Additions
======
I added a team based system where any number of teams can play against eachother in a 
single match. Each team is given a rank based upon how well it did - where lower is
better and where teams can have the same rank if they tie. Players are automatically
adjusted in rating based upon the ranking of their team, and a historical log of 
updates is stored in the player.
