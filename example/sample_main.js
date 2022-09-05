
// ETLデータ定義
var etl_defs = {
	"jobs": [
		{
			"job_name": "job01あいうえ",
			"out_tables": ["tbl01", "tbl02", "tbl03"]
		},
		{
			"job_name": "job11",
			"in_tables": ["tbl01", "tbl02"],
			"out_tables": ["tbl11", "tbl12"]
		},
		{
			"job_name": "job21",
			"in_tables": ["tbl03", "tbl11"],
			"out_tables": ["tbl21"]
		},
		{
			"job_name": "job31",
			"in_tables": ["tbl01", "tbl11", "tbl21"],
			"out_tables": ["tbl31"]
		}
    ]
};

// ETLデータの解釈
// 作成するオブジェクト（配列）
// 1:nodes
//      name        : ジョブ名 or テーブル名
//      level       : 一番最初を0とするレベル
//      type        : 0:ジョブ, 1:テーブル
// 2:links
//      source      : 元node
//      target      : 先node
function parse_etl_defs(df){
    // get_level
    // levelを返す
    // 検査済みのnodeを取っておけば効率化できるけどめんどくさいから後回し
    function get_level(df_, name, job_or_table/*0:job, 1:table*/){
        let ret_val = 0;
        let job_def = df_["jobs"];
        if(job_or_table==0){
            // job
            let cur_job = job_def.find(e => e["job_name"]==name);
            if( "in_tables" in cur_job ){
                let max_level = 0;
                for( t of cur_job["in_tables"] ){
                    let cur_t_level = get_level(df_, t, 1);
                    if( cur_t_level > max_level ){
                        max_level = cur_t_level;
                    }
                }
                ret_val = max_level + 1;
            }else{
                ret_val = 0;
            }
        }else{
            // table
            // 前提: 特定のテーブルを作成するジョブは一意である
            let cur_job = job_def.find(e => (e["out_tables"].indexOf(name)>=0));
            if(cur_job){
                ret_val = get_level(df_, cur_job["job_name"], 0)+1;
            }else{
                // Not Found時（手で作ったテーブルとか）
                ret_val = 0;
            }
        }
        return ret_val;
    }
    var nodes = [];
    var links = [];

    for( j of df["jobs"] ){
        // job
        nodes.push({
            "name"  : j["job_name"],
            "level" : get_level(df, j["job_name"], 0),
            "type"  : 0
        });
        if("in_tables" in j){
            for( t of j["in_tables"] ){
                links.push({
                    "source"    : t,
                    "target"    : j["job_name"]
                });
            }
        }
        for( t of j["out_tables"] ){
            links.push({
                "source"    : j["job_name"],
                "target"    : t
            });
        }
        // table
        for( t of j["out_tables"] ){
            nodes.push({
                "name"  : t,
                "level" : get_level(df, t, 1),
                "type"  : 1
            });
        }
    }

    return [nodes, links];
}
// linkのsourceにあってnodeにない場合はnodeに追加
function add_empty_job(nodes, links){
    for(l of links){
        // nodeを検索
        let cur_source_node = nodes.find(n => (n["name"]==l["source"]));
        if(! cur_source_node){
            // ない
            let cur_target_node = nodes.find(n => (n["name"]==l["target"]));
            nodes.push({
                "name"      : l["source"],
                "level"     : 0,
                "type"      : (cur_target_node["type"]==0)?1:0
            });
        }
    }
}
var [job_nodes, job_links] = parse_etl_defs(etl_defs);
console.log({job_links});
add_empty_job(job_nodes, job_links);
console.log({job_nodes});
//console.log({job_links});


// 描画するところ
var svg = d3.select("svg")
    .style("font-family", "'ヒラギノ角ゴ Pro W3',Hiragino Kaku Gothic Pro,'メイリオ',Meiryo,Osaka,'ＭＳ Ｐゴシック',MS PGothic,sans-serif")
;
var svg_g = svg.append("g");
//svg領域の大きさを定義する
var svgheight = 960, svgwidth = 1000;

// link
var links = svg_g.selectAll(".link")
        .data(job_links)
        .enter()
        .append("line")
        .attr("class", "link")
        .attr("stroke", "#666")
        .attr("stroke-weight", 1)
;

// node
var nodes1 = svg_g.selectAll("circle")
        .data(job_nodes)
        .enter()
        .append("circle")
        .attr("class", "job-circle")
        .attr("r", function(d){ return (d["type"]==0)? 20:10; })
        .attr("fill", function(d){ return (d["type"]==0)? "#e33":"#66e"; })
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended)
        )
        .on("click", function(d){ console.log(d.name); })
;
var texts1 = svg_g.selectAll("text")
        .data(job_nodes)
        .enter()
        .append("text")
        .attr("x", function(d){ return d.x; })
        .attr("y", function(d){ return d.y; })
        .text(d => d["name"])
;

var line_force = d3.forceSimulation()
        .nodes(job_nodes)
        .on("tick", ticked)
        .force(
            "link",
            d3.forceLink(job_links)
                .id(function(d){ return d.name; })
                .distance(20)
        )
        .force("center", d3.forceY(svgheight/2))
        .force("charge", d3.forceManyBody().strength(-20))
        .force("collide", d3.forceCollide(40))
        .velocityDecay(0.5)
;
for( let i=0; i<job_nodes.length; i++ ){
    line_force.nodes()[i].fx = 50 + job_nodes[i].level * 100;
}

//ドラッグ開始時
function dragstarted(d) {
    if (!d3.event.active) line_force.alphaTarget(0.9).restart();
    //d.fx = d.x;
    d.fy = d.y;
}
// ドラッグ中
function dragged(d) {
    //d.fx = d3.event.x;
    d.fy = d3.event.y;
}
//ドラッグ終了時
function dragended(d) {
    if (!d3.event.active) line_force.alphaTarget(.03);
    //d.fx = null;
    d.fy = null;
}
// tick
function ticked(){
    nodes1
        .attr("cx", function(d){ return d.x; })
        .attr("cy", function(d){ return d.y; })
    ;
    links
        .attr("x1", function(d){ return d.source.x; })
        .attr("y1", function(d){ return d.source.y; })
        .attr("x2", function(d){ return d.target.x; })
        .attr("y2", function(d){ return d.target.y; })
    ;
    texts1
        .attr("x", function(d){ return d.x-10; })
        .attr("y", function(d){ return d.y+35; })
    ;
}
// 拡大縮小
var zoomed = function(){
    svg_g.attr("transform", d3.event.transform);
};
svg.call(
    d3.zoom()
        .scaleExtent([0.3, 12])
        .on("zoom", zoomed)
);
