
function registerPlotListeners() {

    var d = vq.events.Dispatcher;
    d.addListener('data_ready','associations',function(data) {
        if (re.state.query_cancel) { return;}
        renderCircleData(data);
        renderCircleLegend('top-right');
    });
    d.addListener('data_ready','sf_associations',function(response) {
        if (re.state.query_cancel) { return;}
        renderSFCircleData(response.features,response.filter);
        renderCircleLegend('center');
    });
    d.addListener( 'data_ready','graph',function(data) {
        var obj = {
            network : data,
            div : 'graph-panel'
        };
        initializeGraph(obj);
    });
    d.addListener( 'frame_ready','graph',function() {
        if (!re.display_options.cytoscape.ready) {
            renderGraph();
        }
    });
    d.addListener('data_ready','dataset_labels',function(obj){
        generateColorMaps(obj);
    });
    d.addListener('data_ready','annotations',function(obj){
        re.plot.chrom_length = obj['chrom_leng'];
    });
    d.addListener('render_scatterplot','details', function(obj){
        scatterplot_draw(obj);
    });
    d.addListener('render_linearbrowser','circvis', function(obj){
        renderLinearData(obj);
        renderLinearLegend();
    });
    d.addListener('render_linearbrowser','feature_circvis', function(obj){
        renderLinearFeatureData(obj);
        renderLinearLegend();
    });
    d.addListener('render_complete','circvis', function(obj){
        re.circvis_obj = obj;
    });
    d.addListener('render_complete','graph', function(obj){
        //re.cytoscape.obj = obj.graph;
    });
    d.addListener('modify_circvis', function(obj){
        modifyCircle(obj);
    });
    d.addListener('layout_network', function(obj){
        if (re.display_options.cytoscape.ready) {
            layoutGraph();
        }
    });

}

function layoutGraph() {
    re.cytoscape.obj.layout(getNetworkLayout());
}

function getNetworkLayout() {
    var layout =  {name : "ForceDirected", options  : {gravitation : -500,mass: 3,
        tension: .01,drag:0.1,maxDistance:10000, minDistance: 1,
        iterations:200, autoStabilize: true, maxTime: 3000, restLength: 30}};

    switch(re.display_options.cytoscape.layout) {
        case('tree'):
            layout = {name : 'Tree',
                options:{
                    orientation: "topToBottom",
                    depthSpace: 50,
                    breadthSpace: 30,
                    subtreeSpace: 5
                }};
            break;
        case('radial'):
            layout = {name : 'Radial',
                options:{
                    angleWidth: 360,
                    radius: 150
                }};
            break;
        case('force_directed'):
        default:
            layout =  {name : "ForceDirected", options  : {gravitation : -500,mass: 3,
                tension: .01,drag:0.1,maxDistance:10000, minDistance: 1,
                iterations:200, autoStabilize: true, maxTime: 3000, restLength: 30}};
            break;
    }

    return layout;
}

function modifyCircle(object) {
    if (object.pan_enable != null) {
        re.circvis_obj.setPanEnabled(object.pan_enable);
    }
    if (object.zoom_enable  != null) {
        re.circvis_obj.setZoomEnabled(object.zoom_enable);
    }
}

function generateColorMaps(dataset_labels) {
    var current_source_list = dataset_labels['feature_sources'].map(function(row) { return row.source;});
    var num_sources = current_source_list.length;
    re.plot.link_sources_array = [];
    current_source_list.forEach(function(row, index) {
        var color = re.plot.colors.link_type_colors(index);
        for (var i = 0; i < num_sources; i++) {
            re.plot.link_sources_array.push(color);
            color = color.darker(.3);
        }
    });
    var source_map = pv.numerate(dataset_labels['feature_sources'], function(row) {return row.source;});
    var current_data = re.plot.all_source_list.filter(function(input_row){return source_map[input_row] != undefined;});
    var current_map = pv.numerate(current_data);

    //re.plot.colors.node_colors = function(source) { return re.plot.colors.source_color_scale(current_map[source]);};
    re.plot.colors.link_sources_colors = function(link) { return re.plot.link_sources_array[current_map[link[0]] * current_data.length + current_map[link[1]]];}
}

function renderCircleLegend(anchor) {
    legend_draw('circle-legend-panel',anchor);
}
function renderLinearLegend(anchor) {
    legend_draw('linear-legend-panel',anchor);
}

function renderCircleData(data) {
    Ext.getCmp('circle-legend-panel').setPosition(880,20);
    Ext.getCmp('circle-legend-panel').doLayout();
    Ext.getCmp('circle-colorscale-panel').el.innerHTML = '';
    wedge_plot(data, document.getElementById('circle-panel'));
}

function renderSFCircleData(data,filter) {
    singlefeature_circvis(data,filter, document.getElementById('circle-panel'));
    var field = re.display_options.circvis.rings.pairwise_scores.value_field;
    var association  = re.model.association.types[re.model.association_map[field]];
    Ext.getCmp('circle-legend-panel').setPosition(375,330);
    Ext.getCmp('circle-legend-panel').doLayout();
    colorscale_draw( association,'circle-colorscale-panel');
}

function renderLinearData(obj) {
    linear_plot(vq.utils.VisUtils.extend(obj,{div:document.getElementById('linear-panel')}));
}

function renderGraph(data) {

    populateGraph();
}

function inter_chrom_click(node) {
    initiateDetailsPopup(node);
}

function initiateDetailsPopup(link) {
    var e =new vq.events.Event('click_association','vis',link);
    e.dispatch();
}


function colorscale_draw(association_obj, div) {
    var box_width = 4;
    var width = 180,
        scale_width = width - 20,
        box_width = 4,
        end = 10,
        start = -10,
        step_size = end - start,
        steps = scale_width / box_width;
    var vis= new pv.Panel()
        .top(10)
        .left(10)
        .height(70)
        .width(width)
        .strokeStyle('black')
        .lineWidth(1)
        .canvas(div);
    var x_axis = pv.Scale.linear(start,end).range(0,scale_width);
    var legend = vis.add(pv.Panel)
        .left(10)
        .right(10)
        .strokeStyle('black')
        .lineWidth(1)
        .bottom(30)
        .height(30);
    legend.add(pv.Bar)
        .data(pv.range(start,end,step_size/steps))
        .width(box_width)
        .left(function() { return this.index * box_width;})
        .fillStyle(association_obj.vis.scatterplot.color_scale);

    legend.add(pv.Rule)
        .data(x_axis.ticks())
        .left(x_axis)
        .strokeStyle('#000')
        .lineWidth(1)
        .anchor('bottom').add(pv.Label)
        .font('10px bold Courier, monospace')
        .text(x_axis.tickFormat);

    vis.anchor('bottom').add(pv.Label)
        .text(association_obj.label);

    vis.render();

}

function legend_draw(div_id,anchor) {

    var dataset_labels = re.ui.getDatasetLabels();
    var source_map = pv.numerate(dataset_labels['feature_sources'], function(row) {return row.source;});
    var current_locatable_data = re.plot.locatable_source_list.filter(function(input_row){return source_map[input_row] != undefined;});
    var current_data = re.plot.all_source_list.filter(function(input_row){return source_map[input_row] != undefined;});
    var current_map = pv.numerate(current_data);

    var anchor = anchor || 'top-right';
    var width=800, height=800;
    var legend_height = (30 + current_locatable_data.length * 13), legend_width = 220;
    var top = 20, left = 0;
    if (arguments[1] != undefined) {anchor = arguments[1];}
    switch(anchor) {
        case('center'):
            Ext.getCmp(div_id).setPosition(345,330);
            Ext.getCmp(div_id).doLayout();
            break;
        case('top-right'):
            Ext.getCmp(div_id).setPosition(880,20);
            Ext.getCmp('circle-legend-panel').doLayout();
        default:
            break;
    }

    //re.plot.colors.node_colors = function(source) { return re.plot.colors.source_color_scale(current_map[source]);};
    re.plot.colors.link_sources_colors = function(link) { return re.plot.link_sources_array[current_map[link[0]] * current_data.length + current_map[link[1]]];}

    var vis= new pv.Panel()
        .left(left)
        .top(top)

        .width(legend_width)
        .height(legend_height)
        .lineWidth(1)
        .strokeStyle('black')
        .canvas(div_id);


    var drawPanel = vis.add(pv.Panel)
        .top(20)
        .left(0);

    drawPanel.add(pv.Label)
        .textAlign('left')
        .top(10)
        .left(12)
        .text('Features')
        .font("14px helvetica");

    var color_panel = drawPanel.add(pv.Panel)
        .left(10)
        .top(10);
    var entry =  color_panel.add(pv.Panel)
        .data(current_locatable_data)
        .top(function() { return this.index*12;})
        .height(12);
    entry.add(pv.Bar)
        .left(0)
        .width(12)
        .top(1)
        .bottom(1)
        .fillStyle(function(type) { return re.plot.colors.node_colors(type);});
    entry.add(pv.Label)
        .text(function(id) { return re.label_map[id] || id;})
        .bottom(0)
        .left(20)
        .textAlign('left')
        .textBaseline('bottom')
        .font("11px helvetica");

    vis.render();
}



function singlefeature_circvis(features,filter,div) {
    var width=800, height=800;
    var chrom_keys = ["1","2","3","4","5","6","7","8","9","10",
        "11","12","13","14","15","16","17","18","19","20","21","22","X","Y"];
    var stroke_style = re.plot.colors.getStrokeStyleAttribute();

    function genome_listener(chr) {
        var e = new vq.events.Event('render_linearbrowser','feature_circvis',{data:scatterplot_data,filter:filter,chr:chr});
        e.dispatch();
    }

    function wedge_listener(feature) {
        var chr = feature.chr;
        var neighborhood = getFeatureNeighborhood(feature,2.5*re.MILLION);
        var start = neighborhood.start;
        var range_length = neighborhood.end - neighborhood.start;
        var e = new vq.events.Event('render_linearbrowser','feature_circvis',{data:scatterplot_data,filter:filter,chr:chr,start:start,range:range_length});
        e.dispatch();
    }

    var karyotype_tooltip_items = {
        'Cytogenetic Band' : function(feature) { return  vq.utils.VisUtils.options_map(feature)['label'];},
        Location :  function(feature) { return 'Chr' + feature.chr + ' ' + feature.start + '-' + feature.end;}
    };
        
    var scatterplot_data = features;

    var field = re.display_options.circvis.rings.pairwise_scores.value_field;
    var true_value_field = field;
    var association  = re.model.association.types[re.model.association_map[field]];
    var settings = association.vis.scatterplot;
    if (settings.values === undefined) { settings.values = {};}
    var min = pv.min(scatterplot_data, function(o) { return o[field];}) ;
    var max = pv.max(scatterplot_data, function(o) { return o[field];}) ;
    var scale_type = settings.scale_type;

    var chrom_leng = vq.utils.VisUtils.clone(re.plot.chrom_length);
    var floor = settings.values.floor === undefined ? min : settings.values.floor;
    var ceil = settings.values.ceil === undefined ? max : settings.values.ceil;
    if ( floor != min || ceil != max)  {
        scatterplot_data = features.map(function(obj){
            var return_obj = obj;
            return_obj[field+'_plot'] = Math.max(floor,Math.min(return_obj[field],ceil));
            return return_obj;
        });

        field = field+'_plot';
    }
    min = floor;
    max = ceil;


    function re_interpolate(new_domain) {
        var old_domain  = settings.color_scale.domain(), old_range = settings.color_scale.range();
        var scale = pv.Scale.linear(old_domain);
        scale.range.apply(scale,new_domain);
        var new_good_domain = old_domain.map(scale);
        var new_scale = pv.Scale.linear.apply(pv.Scale,new_good_domain);
        new_scale.range.apply(new_scale,old_range);
        settings.color_scale= new_scale;
    }
    re_interpolate([min,max]);



    var data = {
        GENOME: {
            DATA:{
                key_order : chrom_keys,
                key_length : chrom_leng
            },
            OPTIONS: {
                radial_grid_line_width: 1,
                label_layout_style : 'clock',
                listener : genome_listener,
                label_font_style : '18pt helvetica'
            }
        },
        TICKS : {
            DATA : {
                data_array : scatterplot_data
            },
            OPTIONS :{
                display_legend : false,
                listener : wedge_listener,
                stroke_style :stroke_style,
                fill_style : function(tick) {return re.plot.colors.node_colors(tick.source); },
                tooltip_items :  re.display_options.circvis.tooltips.feature,
                tooltip_links : re.display_options.circvis.tooltips.links
            }
        },
        PLOT: {
            width : width,
            height :  height,
            horizontal_padding : 30,
            vertical_padding : 30,
            container : div,
            enable_pan : false,
            enable_zoom : false,
            show_legend: false,
            legend_include_genome : false,
            legend_corner : 'ne',
            legend_radius  : width / 15,
            rotate_degrees : re.display_options.circvis.rotation
        },
        WEDGE:[
            {
                PLOT : {
                    height : re.display_options.circvis.rings.karyotype.radius,
                    type :   'karyotype'
                },
                DATA:{
                    data_array : cytoband
                },
                OPTIONS: {
                    legend_label : 'Cytogenetic Bands' ,
                    legend_description : 'Chromosomal Cytogenetic Bands',
                    outer_padding : 10,
                    tooltip_items : karyotype_tooltip_items
                }
            },{
                PLOT : {
                    height : re.display_options.circvis.rings.cnvr.radius,
                    type :   'tile'
                },
                DATA:{
                    data_array : vq.utils.VisUtils.clone(scatterplot_data.filter(function(feature){return feature.source == 'CNVR';}))
                },
                OPTIONS: {
                    legend_label : 'Somatic Copy Number Variation' ,
                    legend_description : 'Somatic Copy Number Variation',
                    outer_padding : 10,
                    tile_padding: 4,
                    tile_height: 8,
                    tile_overlap_distance:1000000,
                    fill_style  : function(feature) {return re.plot.colors.node_colors(feature.source);  },
                    stroke_style  : function(feature) {return re.plot.colors.node_colors(feature.source);  },
                    tooltip_items : re.display_options.circvis.tooltips.feature,
                    tooltip_links :  re.display_options.circvis.tooltips.links,
                    listener : wedge_listener
                }
            },{
                PLOT : {
                    height : re.display_options.circvis.rings.pairwise_scores.radius,
                    type :   'scatterplot'
                },
                DATA:{
                    data_array : scatterplot_data,
                    value_key : field
                },
                OPTIONS: {
                    legend_label : association.label ,
                    legend_description : association.label + ' Values',
                    outer_padding : 10,
                    base_value : (max - min) / 2,
                    min_value : min,
                    max_value : max,
                    radius : 2,
                    draw_axes : true,
                    shape : function(feature) {return (feature[true_value_field] < min || feature[true_value_field] > max) ? 'diamond' : 'circle';},
                    fill_style  : function(feature) {return settings.color_scale(feature[field]); },
                    stroke_style  : function(feature) {return settings.color_scale(feature[field]); },
                    tooltip_items : re.display_options.circvis.tooltips.feature,
                    tooltip_links :  re.display_options.circvis.tooltips.links,
                    listener : wedge_listener
                }
            }
        ]
    };
    var circle_vis = new vq.CircVis();
    var obj = modifyCircvisObject(data,filter);
    var dataObject ={DATATYPE : "vq.models.CircVisData", CONTENTS : obj };
    circle_vis.draw(dataObject);

    var e = new vq.events.Event('render_complete','circvis',circle_vis);
    e.dispatch();

    return circle_vis;
}

function getFeatureNeighborhood(feature,window_size) {
    var f= vq.utils.VisUtils.clone(feature);
    f.start = f.start - window_size;
    f.end = (f.end || feature.start) + window_size;
    return f;
}

function isOrdinal(label) {
    return label =='B';
}

function isNominal(label) {
    return  label =='C';
}

function isNonLinear(label) {
    return isOrdinal(label) || isNominal(label);
}


function isNAValue(data_type,value) {
    if (isNonLinear(data_type))  return value == 'NA';
    else  return isNaN(value);
}

re.MILLION = 1000000;


function scatterplot_draw(params) {
    var data = params.data || re.plot.scatterplot_data || {data:[]},
        div = params.div || null,
        regression_type = params.regression_type || 'none',
        reverse_axes = params.reverse_axes || false,
        discretize_x = params.discretize_x || false,
        discretize_y = params.discretize_y || false;
    re.plot.scatterplot_data = data;

    if (data === undefined) {return;}  //prevent null plot

    var dataset_labels=re.ui.getDatasetLabels();
    var patient_labels = dataset_labels['patients'];
    var f1 = data.f1alias, f2 = data.f2alias;
    var f1label = data.f1alias, f2label = data.f2alias;
    var f1values, f2values;

    if (isNonLinear(f1label[0])) {
        f1values = data.f1values.split(':');
    } else {
        f1values = data.f1values.split(':').map(function(val) {return parseFloat(val);});
    }
    if (isNonLinear(f2label[0])) {
        f2values = data.f2values.split(':');
    } else {
        f2values = data.f2values.split(':').map(function(val) {return parseFloat(val);});
    }

    if (f1values.length != f2values.length) {
        vq.events.Dispatcher.dispatch(new vq.events.Event('render_fail','scatterplot','Data cannot be rendered correctly.'));
        return;
    }
    var data_array = [];
    for (var i=0; i< f1values.length; i++) {
        if (!isNAValue(f1label[0],f1values[i]) && !isNAValue(f2label[0],f2values[i]) ) {
            var obj = {};
            obj[f1] = f1values[i], obj[f2]=f2values[i], obj['patient_id'] = patient_labels[i];
            data_array.push(obj);
        }
    }

    function reverseAxes() {
        config.CONTENTS.xcolumnid = f2;config.CONTENTS.ycolumnid=f1;config.CONTENTS.xcolumnlabel=f2label;config.CONTENTS.ycolumnlabel=f1label;
        tooltip[data.f1alias]=f2;tooltip[data.f2alias]=f1;
        config.CONTENTS.tooltip_items=tooltip;
    }

    var tooltip = {};
    tooltip[data.f1alias] = f1,tooltip[data.f2alias] = f2,tooltip['Sample'] = 'patient_id';

    if(discretize_x && f1label != 'B') {

        var quartiles = pv.Scale.quantile(f1values).quantiles(4).quantiles();
        //Freedman-Diaconis' choice for bin size
        var setSize = 2 * (quartiles[3] - quartiles[1]) / Math.pow(f1values.length,0.33);
        var firstBin = pv.min(f1values)+setSize/2;
        var bins = pv.range(firstBin,pv.max(f1values)-setSize/2,setSize);
        f1values=f1values.map(function(val) { return bins[Math.min(Math.max(Math.floor((val-firstBin) / setSize),0),f1values.length-1)];});
    }
    if(discretize_y && f2label != 'B') {
        var f2hist = pv.histogram(f2values).frequencies(true).bins();
    }
    f1label = (discretize_x ? 'B' : f1label[0]) + f1label.slice(1);
    f2label = (discretize_y ? 'B' : f2label[0]) + f2label.slice(1);
    var violin = (isNonLinear(f1label[0]) ^ isNonLinear(f2label[0])); //one is nonlinear, one is not
    var cubbyhole = isNonLinear(f1label[0]) && isNonLinear(f2label[0]);

    var sp,config;
    if (violin)     {
        sp = new vq.ViolinPlot();
        config ={DATATYPE : "vq.models.ViolinPlotData", CONTENTS : {
            PLOT : {container: div,
                width : 600,
                height: 300,
                vertical_padding : 40, horizontal_padding: 40, font :"14px sans"},
            data_array: data_array,
            xcolumnid: f1,
            ycolumnid: f2,
            valuecolumnid: 'patient_id',
            xcolumnlabel : f1label,
            ycolumnlabel : f2label,
            valuecolumnlabel : '',
            tooltip_items : tooltip,
            show_points : true,
            regression :regression_type
        }};
        if (isNonLinear(f2label[0])) {
            reverseAxes();
        }
        sp.draw(config);
    }
    else if(cubbyhole) {
        sp = new vq.CubbyHole();
        config ={DATATYPE : "vq.models.CubbyHoleData", CONTENTS : {
            PLOT : {container: div,
                width : 600,
                height: 300,
                vertical_padding : 40, horizontal_padding: 40, font :"14px sans"},
            data_array: data_array,
            xcolumnid: f1,
            ycolumnid: f2,
            valuecolumnid: 'patient_id',
            xcolumnlabel : f1label,
            ycolumnlabel : f2label,
            valuecolumnlabel : '',
            tooltip_items : tooltip,
            show_points : true,
            radial_interval : 7
        }};
        if (reverse_axes) {
            reverseAxes();
        }
        sp.draw(config);
    }
    else {
        sp = new vq.ScatterPlot();

        config ={DATATYPE : "vq.models.ScatterPlotData", CONTENTS : {
            PLOT : {container: div,
                width : 600,
                height: 300,
                vertical_padding : 40, horizontal_padding: 40, font :"14px sans"},
            data_array: data_array,
            xcolumnid: f1,
            ycolumnid: f2,
            valuecolumnid: 'patient_id',
            xcolumnlabel : f1label,
            ycolumnlabel : f2label,
            valuecolumnlabel : '',
            tooltip_items : tooltip,
            radial_interval : 7,
            regression :regression_type
        }};
        if (reverse_axes) {
            reverseAxes();
        }
        sp.draw(config);
    }

    var e = new vq.events.Event('render_complete','scatterplot',sp);
    e.dispatch();
    return sp;

}

function renderLinearFeatureData(obj) {
    plotFeatureDataLinear(vq.utils.VisUtils.extend(obj,{div:document.getElementById('linear-panel')}));
}


function plotFeatureDataLinear(obj) {
    var div = obj.div || null, features = obj.data || [], chrom = obj.chr || '1', start = obj.start || null, range_length = obj.range || null;

    features=features.filter(function(f) { return f.chr == chrom;});
    var stroke_style_fn = re.plot.colors.getStrokeStyleAttribute();

    var field = re.display_options.circvis.rings.pairwise_scores.value_field;
    var true_value_field = field;
    var association  = re.model.association.types[re.model.association_map[field]];
    var settings = association.vis.scatterplot;
    if (settings.values === undefined) { settings.values = {};}
    var min =  settings.values.floor;
    var max =  settings.values.ceil;

    if (features[0][field+'_plot'] !== undefined) field = field+'_plot';

    var data_obj = function() { return {
        PLOT :     {
            width:800,
            height:700,
            min_position:1,
            max_position:maxPos,
            vertical_padding:20,
            horizontal_padding:20,
            container : div,
            context_height: 100,
            axes : {
                x: {label : 'Chromosome ' + chrom + ' (Mb)',
                    scale_multiplier : (1 / re.MILLION)
                }
            }
        },
        TRACKS : [
            { type: 'glyph',
                label : 'Feature Types',
                description : 'Genome Location of Features',
                CONFIGURATION: {
                    fill_style : function(tick) {return re.plot.colors.node_colors(tick.source); },
                    stroke_style : stroke_style_fn,
                    shape :  'square',
                    track_height : 290,           //required
                    track_padding: 30,             //required
                    tile_height:12,                //required
                    tile_padding:3,              //required
                    radius: 4,
                    //required
                    tile_overlap_distance:1 * re.MILLION,    //required
                    tile_show_all_tiles : true,
                    track_fill_style : pv.color('#EEDDEE'),
                    track_line_width : 1,
                    track_stroke_style: pv.color('#000000'),
                    notifier:function(feature) { window.open(re.display_options.circvis.tooltips.links['UCSC Genome Browser'](feature)); return false;}         //optional
                },
                OPTIONS: {
                    tooltip_links :re.display_options.circvis.tooltips.links,
                    tooltip_items :  re.display_options.circvis.tooltips.feature     //optional
                },
                data_array : features
            },{ type: 'scatter',
                label : 'Aggressiveness Scores',
                description : 'Clinical Scores of Features',
                CONFIGURATION: {
                    fill_style : function (feature) {  return settings.color_scale(feature[field]);  },          //required
                    stroke_style : function (feature) { return 'grey';},//return score_color_scale(feature.value);  },          //required
                    track_fill_style : pv.color('#EEEEEE'),
                    track_height : 200,           //required
                    track_padding: 20,             //required
                    min_value : min*1.1,
                    max_value : max*1.1,
                    base_value : 0,
                    num_y_rule_lines: 5,
                    shape : function(feature) {return (feature[true_value_field] < min || feature[true_value_field] > max) ? 'diamond' : 'circle';},
                    radius:4,
                    notifier:function(feature) { window.open(re.display_options.circvis.tooltips.links['UCSC Genome Browser'](feature)); return false;}         //optional
                },
                OPTIONS: {
                    tooltip_links : re.display_options.circvis.tooltips.links,
                    tooltip_items :  re.display_options.circvis.tooltips.feature     //optional
                },
                data_array :features,
                value_key:field
            }]
    }
    };
    var chrom_leng = vq.utils.VisUtils.clone(re.plot.chrom_length);
    var chr_match = chrom_leng.filter(function(chr_obj) { return chr_obj.chr_name == chrom;});
    var maxPos = Math.ceil(chr_match[0]['chr_length']);
    var lin_browser = new vq.LinearBrowser();
    var lin_data = {DATATYPE: 'vq.models.LinearBrowserData',CONTENTS: data_obj()};

    lin_browser.draw(lin_data);

    if (start != null && start > 0 && range_length != null && range_length > 0) {
        lin_browser.setFocusRange(start,range_length);
    }

    obj.vis = lin_browser;
    var e = new vq.events.Event('render_complete','linear',obj);
    e.dispatch();

    return lin_browser;
}


function initializeGraph(obj) {
    var div_id = obj.div;

    // initialization options
    var options = {
        // where you have the Cytoscape Web SWF
        swfPath: re.cytoscape['swfPath'],
        // where you have the Flash installer SWF
        flashInstallerPath: re.cytoscape['flashInstallerPath']
    };
    re.cytoscape.obj = new org.cytoscapeweb.Visualization(div_id, options);
    re.cytoscape.data = obj.network;
}


function populateGraph(obj) {

    // you could also use other formats (e.g. GraphML) or grab the network data via AJAX
    var network = {
        dataSchema: {
            nodes: [ { name: "label", type: "string" },
                //{ name: "genescore", type: "number" },
                { name: "type", type: "string" },
                { name: "chr", type: "string" },
                { name: "start", type: "int" },
                { name: "end", type: "int" }
            ],
            edges: [ { name: "label", type:"string"},
                { name: "directed", type: "boolean", defValue: false} ].concat(
                re.model.association.types.map(function(obj) { return obj.vis.network.edgeSchema;}))
        },
        data:  re.cytoscape.data
    };

    var visual_style = {
        nodes: {
            shape:'ELLIPSE',
            size: 25,
            color: {
                defaultValue: '#FFF',
                customMapper: { functionName :'mapFeatureType'}
            },
            labelFontSize : 20,
            labelHorizontalAnchor: "center",
            labelVerticalAnchor : "top"
        },
        edges: {
            width: 3,
            color: "#0B94B1"
        }
    };

    // init and draw
    var scale = pv.Scale.ordinal().range("#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",  "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf");

    function rgbToHex(R,G,B) {return '#' + toHex(R)+toHex(G)+toHex(B)}
    function toHex(n) {
        n = parseInt(n,10);
        if (isNaN(n)) return "00";
        n = Math.max(0,Math.min(n,255));
        return "0123456789ABCDEF".charAt((n-n%16)/16)
            + "0123456789ABCDEF".charAt(n%16);
    }

    re.cytoscape.obj["mapFeatureType"] =  function(data)   {
        var color = scale(data.type);
        return rgbToHex(color.r,color.g,color.b);
    };
    var layout =getNetworkLayout();

    re.cytoscape.obj.ready(function() {
        re.display_options.cytoscape.ready = true;
        var e = new vq.events.Event('render_complete','graph',{});
        e.dispatch();
    });

    re.cytoscape.obj.draw({ network: network,

        // let's try another layout
        layout:layout,

        // set the style at initialisation
        visualStyle: visual_style });
}

function modifyCircvisObject(obj,filter) {
    if (re.display_options.circvis.ticks.wedge_width_manually) {
        obj.PLOT.width=re.display_options.circvis.width;
    }
    if (re.display_options.circvis.ticks.wedge_width_manually) {
        obj.PLOT.height=re.display_options.circvis.height;
    }
    var chrom_keys = re.display_options.circvis.chrom_keys;

    var chrom_leng = vq.utils.VisUtils.clone(re.plot.chrom_length);

    if (re.display_options.circvis.ticks.tile_ticks_manually) {
        obj.TICKS.OPTIONS.tile_ticks  = true;
        obj.TICKS.OPTIONS.overlap_distance = re.display_options.circvis.ticks.tick_overlap_distance;
    }

    try {
        if (filter.t_chr !="*") {
            var filter_chr = filter.t_chr.replace(' ','').split(',');
            obj.GENOME.DATA.key_order=chrom_keys.filter(function(f) { return filter_chr.some(function(key) {return key == f;}); });
            obj.GENOME.DATA.key_length=chrom_leng.filter(function(f) { return filter_chr.some(function(key) {return key == f.chr_name;});});
        }
    } catch(e) {

    }

    var plots = [];

    var rings = re.display_options.circvis.rings;

    Object.keys(rings).forEach(function(ring, index) {
        if (rings[ring].hidden !== true) {
            plots.push(obj.WEDGE[index]);
        }
    });
    obj.WEDGE = plots;

    obj.PLOT.rotate_degrees = re.display_options.circvis.rotation;
    if (re.display_options.circvis.ticks.wedge_width_manually) {
        obj.TICKS.OPTIONS.wedge_width = re.display_options.circvis.ticks.wedge_width;
    }
    if (re.display_options.circvis.ticks.wedge_height_manually) {
        obj.TICKS.OPTIONS.wedge_height = re.display_options.circvis.ticks.wedge_height;
    }

//    obj.WEDGE.forEach(function(wedge) {
//        wedge.PLOT.height = re.display_options.circvis.ring_radius /2;
//    });
    return obj;
}

