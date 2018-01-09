//vars needed for slider
var dateRange = [];
var nowHour = toHours(Date());
var curHour = nowHour; //initial value
var refVals = [50,100,200,300,400,500,600,700,800,900,1000];

var newSvg = d3.select("#sliderDiv")
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", "0 0 960 40")
    .attr("id", "slider");

var sliderSvg = d3.select("#slider"),
    margin = { right: 20, top: 20, left: 20, bottom:20},
    width = 960 - margin.left - margin.right,
    height = 500;

function toHours(d) {
    var coef = 1000 * 60 * 60;
    d = new Date(d);
    return new Date(Math.round(d.getTime() / coef) * coef);
}

var loadingDiv = d3.select("#loadingDiv");
var content = d3.select(".content");

var abflussDiv = d3.select("#abfluss");
var datumDiv = d3.select("#datum");
var timeDiv = d3.select("#time");
var temperaturDiv = d3.select("#temperatur");
var formattedDate = d3.timeFormat("%a, %d %b");
var formattedTime = d3.timeFormat("%H:00");

//vars needed for first wave construction
var waveDivW = document.getElementById('waveDiv').offsetWidth;
var waveDivH = document.getElementById('waveDiv').offsetHeight;

var distW = 1000 / 2,
    waveHeight,
    waveFatness,
    scaleWave,
    maxTranslation,
    minTranslation = 0,
    curTranslation,
    d_string;

var currentData,
    currentVal = 0,
    currentTime;

var levelMap = d3.scaleLinear().domain([0, 800]).range([maxTranslation, minTranslation]);
var waveHeightMap = d3.scalePow().exponent(1).range([70, 200]);
var waveFatnessMap = d3.scalePow().exponent(1).range([200, 70]);

d3.select(".waveWrapper").append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("id", "wave1");

for (var i = 0; i < refVals.length; i++) {

    d3.select("#wave1")
        .append("g")
        .attr("id", "refWaves"+i)
            .append("path")
            .attr("class", "refWave")
            .attr("vector-effect", "non-scaling-stroke")
            .attr("id", "refWave"+i);
}

d3.select("#wave1")
    .append("g")
    .attr("id", "gWave1")
    .append("path")
    .attr("class", "wavepath")
    .attr("vector-effect", "non-scaling-stroke")
    .attr("id", "pWave1");

d3.json("https://cors-anywhere.herokuapp.com/https://www.hydrodaten.admin.ch/graphs/2018/deterministic_forecasts_2018.json", function(futureError, futureData) {
    // d3.json("deterministic_forecasts_2018.json", function(futureError, futureData) {

    //stop loading:
    loadingDiv.attr('class', 'kill');
    content.attr('class', 'content shown');

    futureData = futureData.forecastData.cosmoSeven;
    parseFutureData(futureData);

    dateRange.push(new Date(futureData[0].datetime));
    dateRange.push(new Date(futureData[(futureData.length - 1)].datetime));

    updateData();

    var x = d3.scaleLinear()
        .domain(dateRange)
        .range([0, width])
        .clamp(true);

    //construct slider
    var slider = sliderSvg.append("g")
        .attr("class", "slider")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    slider.append("line")
        .attr("class", "track")
        .attr("x1", x.range()[0])
        .attr("x2", x.range()[1])
        .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
        .attr("class", "track-inset")
        .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
        .attr("class", "track-overlay")
        .call(d3.drag()
            .on("start.interrupt", function() { slider.interrupt(); })
            .on("start drag", function() { sliderMoved(x.invert(d3.event.x)); }));

    // slider.insert("g", ".track-overlay")
    //     .attr("class", "ticks")
    //     .attr("transform", "translate(0," + 18 + ")")
    //     .selectAll("text")
    //     .data(x.ticks(7))
    //     .enter().append("text")
    //     .attr("x", x)
    //     .attr("text-anchor", "middle")
    //     .text(function(d) { return d; });

    var sliderHandle = slider.insert("circle", ".track-overlay")
        .attr("class", "sliderHandle")
        .attr("r", 9);

    //functions for slider
    function sliderMoved(h) {
        sliderHandle.attr("cx", x(h));
        curHour = toHours(h);
        update();
    }

    function animateToday() {
        //animate slider intro
        slider.transition() // Gratuitous intro!
            .duration(750)
            .tween("hue", function() {
                var i = d3.interpolate(dateRange[0], nowHour);
                return function(t) { sliderMoved(i(t)); };
            });
    }  

    //functions for display
    function updateDisplayVal() {

        abflussDiv.text(currentVal)
        datumDiv.text(formattedDate(currentTime));
        timeDiv.text(formattedTime(currentTime));
        // temperaturDiv;

    }

    //functions for data
    function parseFutureData(ar) {
        ar.forEach(function(d) {
            d.datetime = (new Date(d.datetime));
            d.value = parseInt(d.value);
        });
    }

    function updateData() {
        currentData = futureData.filter(function(d) { return d.datetime.getTime() == curHour.getTime() });
        currentVal = currentData[0].value;
        currentTime = currentData[0].datetime;
    }

    //functions for wave
    function calcWave(val) {
        //calc waveshape
        // waveHeight = 70;
        // waveFatness = 200;
        // waveHeight = 210; //if wave is good
        // waveFatness = 80;

        console.log(val);

        if (val < 350) {
            waveHeightMap.domain([0, 350]);
            waveFatnessMap.domain([0, 350]);
        } else {
            waveHeightMap.exponent(1).domain([800, 350]);
            waveFatnessMap.exponent(1).domain([800, 350]);
        }

        waveHeight = waveHeightMap(val);
        waveFatness = waveFatnessMap(val);

        //zwischenschritt
        var l = distW - waveFatness;

        //calc waterlevel
        scaleWave = waveDivW / 1000;
        maxTranslation = waveDivH - waveHeight * scaleWave;

        levelMap.range([maxTranslation, minTranslation]);
        curTranslation = levelMap(val);

        //define path
        // var d_string = "m0,190c1,0 300,-100 300,0c-15,115 225,55 285,30";
        d_string = "m0," + waveHeight / 2 + "c0,0 " + l + ",-" + waveHeight + " " + distW + ",0c" + waveFatness + "," + waveHeight + " " + distW + ",0 " + distW + ",0 L 1000,3000 L 0,3000 Z";
        //"m xpunkt1,ypunkt1 c xankerpunkt,yankerpunkt ankerpunktObenX,ankerpunktObenY punkt2X,punkt2Y c ankerpunktUntenX,ankerpunktUntenY ankerpunkt3X,ankerpunkt3Y punkt3X,punkt3Y";
    }

    function drawWave() {
        d3.select("#gWave1")
            .attr("transform", "translate(0," + curTranslation + ")");

        d3.select("#pWave1")
            .attr("transform", "scale(" + scaleWave + ")")
            .attr("d", d_string);
    }

    function drawRef(){
        for (var i = 0; i < refVals.length; i++) {
            calcWave(refVals[i]);

            d3.select("#refWaves"+i)
                .attr("transform", "translate(0," + curTranslation + ")");

            d3.select("#refWave"+i)
                .attr("transform", "scale(" + scaleWave + ")")
                .attr("d", d_string);
        }
    }


    function update(newVal) {
        //reset window size 
        waveDivW = document.getElementById('waveDiv').offsetWidth;
        waveDivH = document.getElementById('waveDiv').offsetHeight;

        updateData();

        // drawRef();
        calcWave(currentVal);
        // calcWave(300);
        updateDisplayVal();
        drawWave();
    }

    animateToday();
    update();

    window.addEventListener('resize', update);
});


// var formatTime = d3.timeFormat("%Y-%M-%D");

// d3.csv("https://cors-anywhere.herokuapp.com/https://www.hydrodaten.admin.ch/graphs/2018/discharge_2018.csv", function(dischargeError, dischargeData) {
//     if (dischargeError) throw dischargeError;

//     d3.csv("https://cors-anywhere.herokuapp.com/https://www.hydrodaten.admin.ch/graphs/2018/temperature_2018.csv", function(tempError, tempData) {
//         if (tempError) throw tempError;

//         d3.json("https://cors-anywhere.herokuapp.com/https://www.hydrodaten.admin.ch/graphs/2018/deterministic_forecasts_2018.json",function(futureError, futureData){
//             if (futureError) throw futureError;

//             console.log(dischargeData);
//             console.log(tempData);
//             console.log(futureData);



//         });

//         function parseTime(ar) {
//             ar.forEach(function(d) {
//                 d.Datetime = formatTime(d.Datetime);
//             });
//         }

//     });
// });