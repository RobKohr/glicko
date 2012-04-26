var basicTest = function(){
    outClear();
    var player = {name:'a', rating:1500, rd:200, match_rank:3}
    var opponents = [//beat b, but lost to c and d
        {name:'b', rating:1400, rd:30, s:1},
        {name:'c', rating:1550, rd:100, s:0},
        {name:'d', rating:1700, rd:300, s:0}
    ];

    out('player');
    out(player);
    out('opponents');
    out(opponents);
    var result = glicko.calc(player, opponents, null, null, 1);
    out('result');
    out(result);
    out('Expected result update from paper (vol seems different)');
    out({
	rating:1464.06,
	rd:151.52,
	vol:0.05999
    });
}

var teamTest = function(){
    var bears = {
	name:'da bears',
	players:[
	    {name:'jim'},
	    {name:'john'}
	],
	rank:1
    }
    var vikings = {
	name:'vikings',
	players:[
	    {name:'steve'},
	    {name:'stan'}
	],
	rank:2
    }
    outClear();
    var teams = [bears, vikings];
    out('Teams');
    out(teams);
    var result = glicko.teamMatch(teams);
    out('Result');
    out(filterObjectArray(result.players, ['last_result', 'name']));
}

var oneVSOneSimulate = function(){
    teamSimulate(1);
}

var fiveVSFiveSimulate = function(){
    teamSimulate(5);
}

var teamSimulate = function(team_size){
    if(!team_size)
	team_size = 2;
    outClear();
    out("Description");
    out("Creates 10 players with skills 1-10. The sum of two players on the team is the team's skill");
    out("This will run until the ratings of all of the players are ordered the same as their skill");
    out("Matches are random pairings of "+team_size+" vs "+team_size);
    var players = [];
    for(var i = 1; i<=10; i++){
	var player = {name:i+'', expected_rank:i};
	players.push(player);
    }
    var shuffledPlayers = [];
    players.each(function(player){
	shuffledPlayers.push(player);
    })

    out('Running... (please be patient)');

    for(var c = 1; c<200; c++){
	//each loop, shuffle up players and deal them into two teams
	var teams = [];
	shuffledPlayers.shuffle();
//	sortByProperty(shuffledPlayers, 'rd', 1);
	var start = randInt(0, players.length-4)
	var i = 0;
	for(var t = 0; t<=1; t++){
	    var team = {rank:0};
	    team.players = [];

	    for(var p = 0; p<team_size; p++){
		var player = shuffledPlayers[i];
		i++;
		team.rank+=player.expected_rank;
		team.players.push(player);
	    }
//	    team.rank = Math.random() * team.rank;
	    teams.push(team);
	}
	var result = glicko.teamMatch(teams);
	out(filterObjectArray(players, ['expected_rank', 'rating']));

	if(arePlayersProperlyRated(players)){
	    out('success');
	    break;//yes they are!
	}
	console.log(c);
    }
    out('done');
    out('Number of matches = '+c);
}
//players should already be sorted by skill, so 
var arePlayersProperlyRated = function(players){
    sortByProperty(players, 'expected_rank', 1);
    var prev = null;
    for(var i=0; i<players.length; i++){
	var p = players[i];
	if((prev == null)){
	    prev = p.rating;
	    continue
	}else if(p.rating < prev){
	    //fine
	    prev = p.rating;
	    continue;
	}else{
	    if(p.rating==null)
		console.log('hre', p);

	    out('FAIL -> '+p.rating+' is greater than' +  prev);
	    return false;//rating should be less than previous
	}
    }
    out('YES!!!');
    return true;
}



//   Helper functions //

var filterObjectArray = function(arr, included_properties_arr){
    var out = [];
    arr.each(function(obj){
	out.push(filterObject(obj, included_properties_arr));
    });
    return out;
}
					 

var filterObject = function(obj, include){
    var out = {};
    include.each(function(key){
	out[key] = obj[key];
    });
    return out;
}


Array.prototype.shuffle = function() {
    var s = [];
    while (this.length) s.push(this.splice(Math.random() * this.length, 1)[0]);
    while (s.length) this.push(s.pop());
    return this;
}


var randomFromArray = function(arr){

    return arr[i];
}


//order = 1 for asc, -1 for desc
var sortByProperty = function(arr, prop, order){
    if(!order)
	order = 1;
    arr.sort(function(a, b){
	if(a[prop] == b[prop])
	    return 0;
	if(a[prop] > b[prop])
	    var out = 1;
	if(a[prop] < b[prop])
	    var out = -1;
	return order * out;
    });    
    return arr;
}


var randInt = function(min, max){
    var range = max-min;
    var offset = Math.floor(Math.random()*range);
    return offset+min;
}

var outClear = function(){
    document.getElementById('output').innerHTML = ''
}
var out = function(obj){
    document.getElementById('output').innerHTML += '<pre>'+JSON.stringify(obj, null, '\t')+'</pre><hr>';
}

