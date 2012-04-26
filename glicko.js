//based on http://www.glicko.net/glicko/glicko2.pdf
//Code by Robert Kohr 2012 (License agreement at the bottom)


//wrapper to make it easier to use as a node.js module
(function(exports){

    exports.playerInit = function(player){
	if(!player.rating)
	    player.rating = 1500;
	if(!player.rd) //rating deviation
	    player.rd= 350;
	if(!player.vol)//volitility
	    player.vol = 0.06;
	player.rating2 = (player.rating - 1500)/173.7178
	player.rd2 = player.rd/173.7178
	return player;
    }


    /*
Glicko-2 main function (attempts to follow the paper)

Calculate the adjustments to a player after playing against a set of opponents.

Returns an output of an object like so
{
  init:{rd, rating, vol}, //initial values before calculating
  update:{rd, rating, vol}, //new values
  change:{rd, rating, vol}, //difference between init and update
} 

rating_period should be the time in seconds in which a player typically plays
10-15 games. Default is a month. Currently not used in calculations

For system_constants, the paper says pick a number .3 to 1.2.
Adjust to achieve better predictive accuracy. Default is .75
(perhaps a function should be written to calculate a good system_constant)

factor is something I added that isn't in the paper. All outputs are multiplied by
the factor. This is useful if you want to adjust the value of the calculation -
for example 0.5 to half the weight when you are playing on a team of two players.

*/
    exports.calc = function(player, opponents, rating_period, system_constant, factor){
	//set defaults
	var min = 60; var hour = 60*min; var day = 24*hour;
	if(!rating_period)
	    rating_period = day*30;
	var t = system_constant;
	if(!factor)
	    factor = 1;

	//step 1
	//initialize
	if(!t)
	    t = 0.75;

	//p will be the returned object with the updated values for the player
	var p = {};
	p.rating = player.rating;
	p.rd = player.rd;
	p.vol = player.vol;

	//initialize all players
	var initialize_set = [];
	opponents.each(function(opp){
	    initialize_set.push(opp);
	});

	initialize_set.push(p);
	initialize_set.each(function(pl){
	    //step 2 - set glicko-2 values (and initial values).
	    exports.playerInit(pl);
	});

	var out = {update:{}, change:{}, init:{rating:p.rating, rd:p.rd, vol:p.vol}};

	//step 3
	var g = function(rd){
	    return 1/(
		Math.sqrt(
		    1 + (
			(3*pow(rd, 2))/
			    (pow(pi,2))
		    )
		)
	    );
	};

	//the paper has three values comming in for the two players, this just takes the player objects
	var E = function(p1, p2){
	    if(!p1.rd2)
		throw "Missing player 1";
	    if(!p2.rd2)
		throw "Missing player 2"+p2.rd2;
	    
	    return 1 / (1 + Math.exp((-g(p2.rd2)*(p1.rating2-p2.rating2))));
	}

	//iterate over all opponents he played against to calculate variance
    	var v_sum = 0;
	opponents.each(function(opp){
	    var this_v = (pow(g(opp.rd2),2)) * E(p, opp) * (1 - E(p, opp) );
	    v_sum += this_v;	    
	});
	var v = pow(v_sum, -1);

	//step 4
	var part_delta_sum = 0;
	opponents.each(function(opp){
	    var this_delta_part = g(opp.rd2) * (opp.s - E(p, opp) )
	    part_delta_sum += this_delta_part;
	});

	//delta is the change in rating
	var delta = v * part_delta_sum;

	//step 5
	//5.1
	var a = ln(pow(p.vol,2));
	var f = function(x){
	    return (
		(Math.exp(x)*(pow(delta,2)-pow(p.rd2,2)-v-Math.exp(x))) / 
		    (
			2* pow( 
			    (pow(p.rd2,2) + v + Math.exp(x) ),
			    2)
		    )
	    ) - (
		(x - a)/(pow(t,2))
	    )
	}
	var e = 0.000001;//convergence tolerance

	//5.2
	var A = a;
	if( pow(delta,2) > (pow(p.vol,2) + v) ){
	    var B = ln(pow(delta,2) - pow(p.rd2,2), v);
	}else{
	    var k = 1;
	    while(f(a - (k*Math.sqrt(Math.pow(t,2)))) < 0){
		k = k+1;
	    }
	    var B = a - k * Math.sqrt(Math.pow(t,2));
	}

	//5.3
	fa = f(A);
	fb = f(B);

	//5.4
	while((Math.abs(B-A) > e)){
	    var C = A+(A-B)*fa/(fb-fa);
	    fc = f(C);
	    if((fc*fb)<0){
		A = B;
		fa = fb;
	    }else{
		fa = fa/2;
	    }
	    B = C;
	    fb = fc;
	}
	var vol_prime = Math.exp(A/2);

	//Step 6
	var rd2_star = Math.sqrt(Math.pow(p.rd2,2) + Math.pow(vol_prime,2));
	//Step 7
	var rd2_prime = 1/(
	    Math.sqrt( 
		( (1/(Math.pow(rd2_star, 2))) + 1/v )
	    ));

	var rating2_prime_sum = 0;
	opponents.each(function(opp){
	    var sum_el = g(opp.rd2)*(opp.s - E(p, opp));
	    rating2_prime_sum += sum_el;
	});
	var rating2_prime = p.rating2 + pow(rd2_prime,2) * rating2_prime_sum;

	//lets track changes to player
	p.rating2 = rating2_prime;
	p.rd2 = rd2_prime;
	p.vol = vol_prime;

	//step 8 convert back to original scale
	p.rating = p.rating2 * 173.7178 + 1500;
	p.rd = p.rd2 * 173.7171;

	out.change.rating = (p.rating - out.init.rating)*factor;
	out.change.rd = (p.rd - out.init.rd)*factor;
	out.change.vol = (p.vol - out.init.vol)*factor;

	out.update.rating = out.change.rating + out.init.rating;
	out.update.rd = out.change.rd + out.init.rd;
	out.update.vol = out.change.vol + out.init.vol;	
	out.timestamp = (new Date()).getTime() / 1000;//in seconds from unix epoch
	return out;
    }




/* 
Team match calculator (and updater of players in the match)

Example:
teams = 
[
  {
   rank:1,
   name:'Blue Jays', 
   players:
    [
      {name:'bob', rating:3300, rd:4},
      {name:'steve', rating:3300, rd:4},
    ]
  },
  {
    rank:2,
    name:"Robins',
    players:
    [ ...]
   }
];

This function works by calculating what the change would be for each player against all the players
on the opposing team, averaging them, and then dividing by the number of players on that player's team. 

returns {
         teams:
          [same as input, but with all new values applied to players], 
         players:
          [array of just updated players (no team structure)]
        }
*/
    exports.teamMatch = function(teams, rating_period, system_constant){
	var players = [];

	teams.each(function(team, t1){
	    team.players.each(function(p){
		players.push(p);
		var num_players = team.players.length;

		//have the player play against all other teams
		var opponents = [];
		//round up opponents
		teams.each(function(team2, t2){
		    if(t2==t1)
			return; //same team as player p
		    if( (!team2.players) || (!(team2.players.length>0)) )
			return;//no players on team


		    var team_as_player = {rd:0,rating:0,vol:0.06};
		    team2.players.each(function(p2){
			exports.playerInit(p2);
			team_as_player.each(function(val, key){
			    team_as_player[key] += p2[key];
			});
		    });
		    //team as player has the sum of all players, now 
		    //need to devide to average it all out.
		    team_as_player.each(function(val, key){
			team_as_player[key] = val/team2.players.length;
		    });
		    team_as_player.s = exports.s_from_rank(team, team2);
		    opponents.push(team_as_player);
		});
		var result = exports.calc(p, opponents, null, null, 1/num_players);
		if(!p.result_history) 
		    p.result_history = [];
		p.result_history.push(result);
		p.last_result = result;
	    });
	});

	players.each(function(p){
	    var update = p.last_result.update;
	    update.each(function(val, key){
		p[key] = val;
	    });
	});
	return {teams:teams, players:players};
    }
    exports.s_from_rank = function(p, p2){
	if(p2.rank < p.rank)
	    return 0;
	if(p2.rank == p.rank)
	    return .5;
	return 1;
    }





//   Helper Functions ///
    var pow = Math.pow;
    var pi = Math.PI;

    function ln(val){
	return Math.log(val) / Math.LOG10E;
    }
    var debug = function(v){
	console.log(JSON.stringify(v));
    }


    Array.prototype.each = function(callback){
	var arr = this;
	for(var i = 0; i<arr.length; i++){
	    var el = arr[i];
	    if(typeof(el)!='function')
		callback(el, i);
	}
    }

    Object.prototype.each = function(callback){
	var obj = this;
	for(var key in obj){
	    var el = obj[key];
	    if(typeof(el)!='function')
		callback(el, key);
	}
    }



})(typeof exports === 'undefined'? this['glicko']={}: exports);//end module


/*
License for this file (and this file only).


This is free and unencumbered software released into the public domain.

Anyone is free to copy, modify, publish, use, compile, sell, or
distribute this software, either in source code form or as a compiled
binary, for any purpose, commercial or non-commercial, and by any
means.

    In jurisdictions that recognize copyright laws, the author or authors
of this software dedicate any and all copyright interest in the
software to the public domain. We make this dedication for the benefit
of the public at large and to the detriment of our heirs and
successors. We intend this dedication to be an overt act of
relinquishment in perpetuity of all present and future rights to this
software under copyright law.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
    IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

For more information, please refer to <http://unlicense.org/>

*/