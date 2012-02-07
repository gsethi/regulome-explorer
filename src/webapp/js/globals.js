/*
 globals.js

 Import this before MVC scripts.
 */
if (re === undefined) { re = {};}

vq.utils.VisUtils.extend(re, {

    title : 'CRC Aggressiveness Explorer',

    analysis : {
        dataset_method_clause : ' where method=\'crc_agg\'',
        directed_association : false
    },
    state : {
        once_loaded : false,
        query_cancel : false,
        network_query : ''
    },
    rest : {
        query : '/query'
    },
    params: {
        json_out:'&tqx=out:json_array',
        query : 'tq='
    },
    databases: {
        base_uri : '',
        metadata: {
            uri: '/google-dsapi-svc/addama/datasources/csacr'
        },
        rf_ace: {
            uri: '/google-dsapi-svc/addama/datasources/dev'
        },
        solr : {
            uri : '/solr',
            select : '/select/'

        }
    },
    tables: {
        dataset :   '/regulome_explorer_dataset',
        label_lookup : '/refgene',
        chrom_info : '/chrom_info',
        current_data : '',
        network_uri : '',
        feature_uri : '',
        clin_uri : '',
        patient_uri : '',
        feature_data_uri : '',
        pathway_uri : ''
    },

    display_options : {
        circvis : {
            rings:{
                karyotype: {
                    hidden :false
                },
                cnvr : {
                    hidden : false
                },
                pairwise_scores : {
                    value_field : re.model.association.types[0].query.id,
                    hidden : false
                }
            },
            tooltips:{
                feature :  {
                    Feature : function(node) { var pos = node.label.indexOf('_');
                    return pos > 0 ? node.label.slice(0,pos) : node.label;},
                    Source : function(node) { return re.label_map[node.source]},
                    'Location' : function(node) { return node.chr + ' ' + node.start + '-' + node.end + ' ';} ,
                    Other : function(node) { return node.label_mod.replace(/_/g,', ');}
                },
                edge : function(edge) {}

            },
            ticks : {
                tick_overlap_distance : null,
                tile_ticks_manually : false,
                wedge_width: 1,
                wedge_width_manually: false,
                wedge_height: 1,
                wedge_height_manually: false
            },
            network : {
                tile_nodes : false,
                node_overlap_distance : null
            },
            width : 800,
            height : 800,
            ring_radius : 55,
            rotation : 0,
            chrom_keys : ["1","2","3","4","5","6","7","8","9","10",
                "11","12","13","14","15","16","17","18","19","20","21","22","X","Y"]
        },
        cytoscape : {
            frame_ready : false,
            ready : false,
            layout : 'force_directed'
        }
    },
    circvis_obj : {},
    cytoscape: {
        obj : {},
        data:[],
        swfPath : "/cytoscape_web/swf/CytoscapeWeb",
        flashInstallerPath : "/cytoscape_web/swf/playerProductInstall"
    },


    plot: {
        locatable_source_list : ['GEXP','METH','CNVR','MIRN','GNAB','RPPA'],
        unlocatable_source_list : ['CLIN','SAMP','PRDM'],
        link_sources_array :  [],

        colors: {
            link_type_colors : pv.colors("#c2c4ff","#e7cb94","#cedb9c","#e7969c","#e1daf9","#b8e2ef"),
            link_sources_colors : {},
            source_color_scale : pv.Colors.category10(),
            stroke_style_attribute : 'white',
            getStrokeStyleAttribute : function() { return re.plot.colors.stroke_style_attribute; },
            setStrokeStyleAttribute : function(attr) { re.plot.colors.stroke_style_attribute = attr; }
        },
        inter_scale : pv.Scale.linear(0.00005,0.0004).range('lightpink','red'),
        linear_unit : 100000,
        chrome_length : [],

        scatterplot_data : null
    },
    ui: {
        filters: {
            single_feature : true
        },
        chromosomes:  [],
        dataset_labels: [],
        getDatasetLabels : function () { return re.ui.dataset_labels;},
        setDatasetLabels :function(obj) { re.ui.dataset_labels = obj;},
        /*
         *        Order combo list
         *          Objects consist of fields:
         *               value: - String - id to be passed to controller
         *               label - String - id to be used by UI
         */
        limit_list : [{value:10,label:'10'},{value:20,label:'20'},{value:40, label:'40'},{value:100, label:'100'},{value:200, label:'200'},
            {value:1000, label:'1000'},{value:2000, label:'2000'}],
        /*
         *        Limit combo list
         *          Objects consist of fields:
         *               value: - String - id to be passed to controller
         *               label - String - id to be used by UI
         */
        order_list : []
    },

    /*
     Window handles
     global handles to the masks and windows used by events
     */

    windows : {
        details_window : null,
        helpWindowReference : null,
        masks: {
            details_window_mask: null,
            network_mask : null
        }
    },
    data: {
        parsed_data : {network : null,unlocated : null,features : null,unlocated_features:null,located_features:null},
        responses : {network : null},
        patients : {data : null}
    }
});


(function() {
    re.ui.chromosomes.push({value:'*',label:'All'});
    for(var i =1;i <= 22; i++) {
        re.ui.chromosomes.push({value:i+'',label:i+''});
    }
    re.ui.chromosomes.push({value:'X',label:'X'});
    re.ui.chromosomes.push({value:'Y',label:'Y'});

    /*
     Label map
     Hash maps feature type id to feature type label
     */
    re.label_map = {
        '*':'All',
        'GEXP' :'Gene Expression',
        'METH' : 'Methylation',
        'CNVR' : 'Copy # Var Region',
        'CLIN' : 'Clinical',
        'MIRN': 'microRNA',
        'GNAB' : 'Gene Aberration',
        'SAMP' : 'Tumor Sample',
        'PRDM' : 'Paradigm Feature',
        'RPPA'  : 'RPPA'
    };
    re.plot.all_source_list = pv.blend([re.plot.locatable_source_list,re.plot.unlocatable_source_list]);
    re.plot.all_source_map = pv.numerate(re.plot.all_source_list);
    re.plot.locatable_source_map = pv.numerate(re.plot.locatable_source_list);

    re.plot.proximal_distance = 2.5 * re.plot.linear_unit;
    re.plot.colors.features = {
        'GEXP' : '#1f77b4',
        'METH': '#2ca02c',
        'CNVR' : '#ff7f0e',
        'MIRN': '#9467bd',
        'GNAB' : '#d62728',
        'PRDM' : '#8c564b',
        'RPPA' : '#e377c2',
        'CLIN' : '#7f7f7f',
        'SAMP' : '#bcbd22'
        //#17becf
    };

    re.plot.colors.node_colors = function(source) {
        if (source in re.plot.colors.features){
            return pv.color(re.plot.colors.features[source]);
        }
        return "blue";
    };
    re.model.association.types.forEach(function(obj) {
        re.ui.order_list.push({value:obj.id,label:obj.label});
    });

    if (re.analysis.directed_association) {
        re.ui.feature1 = {label : 'Target', id :'target'};
        re.ui.feature2 = {label : 'Predictor', id : 'predictor'};
    } else {
        re.ui.feature1 = {label : 'Feature 1', id : 'feature1'};
        re.ui.feature2 = {label : 'Feature 2', id : 'feature2'};
    }


    re.model.association.types.forEach( function(assoc) {
                            vq.utils.VisUtils.extend(re.display_options.circvis.tooltips.feature, assoc.vis.tooltip.entry);
                        });

})();


