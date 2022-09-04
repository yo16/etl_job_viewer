



//ノードのデータを作成
var range = 10;
var nodes = d3.range(0, range).map(
    function(d,i){
        return {
            id:i,
            label: "l"+d ,
            //r:~~d3.randomUniform(5, 60)()
            r:30
        }
    }
);

//メイン！D3.jsのforcesimulation
//svg領域の大きさを定義する
var svgheight = 960,
      svgwidth = 1000;
var simulation = d3.forceSimulation()
            .force("collide",d3.forceCollide().radius(function(d){return d.r+5;}).iterations(16) ) //衝突値の設定
            .force("charge", d3.forceManyBody().strength(-30))  //反発力の設定
            .force("center", d3.forceCenter(svgwidth / 2, svgheight / 2))  //svg領域の中心を重力の中心とする設定
            .force("x", d3.forceX().x(svgwidth / 2).strength(0.2))  //x方向に戻る力
            .force("y", d3.forceY().y(svgheight / 2).strength(0.2)) //y方向に戻る力
     ;
     
//ノードの色を定義
var color = d3.scaleOrdinal(["#66c2a5", "#fc8d62", "#8da0cb", "#e78ac3", "#a6d854", "#ffd92f", "#e5c494", "#b3b3b3"]);
//ノードをsvg領域に描画する
var node = d3.select("svg").append("g")  //gはSVGの描画に必要なオブジェクトのコンテナ。aとかkとかはだめ。
           .attr("class", "nodes") //gはどんな種類のオブジェクトを持つコンテナかをわかりやすく
           .selectAll("circle") //nodeは円、つまりcircle要素で描画する(ここでは定義されず、ただ"指定(selectAll)"されているだけにすぎない
           .data(nodes) //上部で定義した100個のnodeを持つ配列
           .enter() //上のdataの内容を確定させる
           .append("circle") //ここでcircleを追加し、SVG領域に描画する
           .attr("class","node") //circle１つ１つがnodeというクラスであることを命名する
           .attr("r", function(d){  return d.r ;}) //nodeの大きさ（半径）を指定する
           .attr("fill",function(d){ return color(d.id);}) //nodeの色を指定する。colorは上部で定義されている
           .call(d3.drag()  //nodeをマウスでドラッグした時に通る関数を定義。関数の内容は後ほど
               .on("start", dragstarted)
               .on("drag", dragged)
               .on("end", dragended)
           ); 
//ノードをマウスドラッグで動かすための関数
function dragstarted(d) {  //ドラッグ開始時の関数
      if (!d3.event.active) simulation.alphaTarget(.03).restart();
      d.fx = d.x;
      d.fy = d.y;
}
function dragged(d) {  //ドラッグ中の関数
    d.fx = d3.event.x;
    d.fy = d3.event.y;
}
function dragended(d) { //ドラッグ終了時の関数
    if (!d3.event.active) simulation.alphaTarget(.03);
    d.fx = null;
    d.fy = null;
}

//動作開始！
simulation
    .nodes(nodes)
    .on("tick", ticked);

function ticked() {
    node
        .attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; });
} 
