/*
 globals.js

 Import this before MVC scripts.
 */
if (re === undefined) {
    re = {};
}

vq.utils.VisUtils.extend(re, {

    title: 'Regulome Explorer: Georgetown',
    google: {
        analytics_id: 'UA-20488457-2'
    },
    analysis: {
        dataset_method_clause: ' where method=\'gtown\'',
        directed_association: true,
        hidden: false
    },
    state: {
        once_loaded: false,
        query_cancel: false,
        network_query: ''
    },
    node: {
        uri: '/node',
        services: {
            data: '/data',
            lookup:'/lookup/label/entrez'
        }
    },
    rest: {
        query: '/query',
        echo: '/echo',
        convert: '/convert',
        select: '/distributed_select'
    },
    params: {
        json_out: '&tqx=out:json_array',
        query: 'tq=',
        network_query: 'q=',
        network_json_out: '&wt=json',
        network_dataset_select: '&fq=%2Bdataset%3A'
    },
    databases: {
        base_uri: '',
        metadata: {
            uri: '/google-dsapi-svc/addama/datasources/csacr'
        },
        rf_ace: {
            uri: '/google-dsapi-svc/addama/datasources/re'
        },
        networks: {
            uri: '/data'
        },
        medline: {
            uri: '/solr/core0',
            select: '/select/'
        }
    },
    tables: {
        dataset: '/regulome_explorer_dataset',
        label_lookup: '/refgene',
        chrom_info: '/chrom_info',
        entrez_gene: '/entrez_gene',
        current_data: '',
        network_uri: '',
        feature_uri: '',
        features_uri: '',
        clin_uri: '',
        patient_uri: '',
        feature_data_uri: '',
        pathway_uri: '',
        pathways:'/pathways'
    },
    /*
     *        URL's
     *            addresses to pathways used by MEDLINE tab
     */
    help: {
        links: {
            user_guide: 'http://wiki.cancerregulome.org',
            quick_start: 'http://wiki.cancerregulome.org/bin/view/All+Pairs+Analysis/8.1+Quick+Walk-through+for+One+Feature',
            contact_us: 'http://wiki.cancerregulome.org',
            analysis_summary: '/help/all_pairs/analysis.html',
            bug_report: 'http://code.google.com/p/regulome-explorer/issues/entry',
            user_group: 'http://groups.google.com/group/regulome-explorer',
            ideogram: '/help/msae/images/ideogram.png'
        }
    },
    pathways: {
        wikipw_url: 'http://www.wikipathways.org/index.php?title=Special%3ASearchPathways&doSearch=1&sa=Search&species=Homo+sapiens&query=',
        biocarta_url: 'http://www.biocarta.com/pathfiles/h_',
        kegg_url: 'http://www.genome.jp/kegg-bin/search_pathway_text?map=map&mode=1&viewImage=true&keyword=',
        pw_commons_url: 'http://www.pathwaycommons.org/pc/webservice.do?version=3.0&snapshot_id=GLOBAL_FILTER_SETTINGS&record_type=PATHWAY&format=html&cmd=get_by_keyword&q='
    },

    display_options: {
        circvis: {
            rings: {
                karyotype: {
                    hidden: false,
                    radius: 28
                },
                cnvr: {
                    hidden: true,
                    radius: 40
                },
                pairwise_scores: {
                    value_field: re.model.association.types[0].query.id,
                    hidden: false,

                    manual_y_color_scale:false,
                    min_y_color:'#0000FF',
                    max_y_color:'#FF0000',
                    manual_y_values: false,
                    min_y_value:0,
                    max_y_value:1
                }
            },
             quantiled_data: {
                    GEXP: false,
                    CNVR: false,
                    METH: false
            },
            tooltips: {
                feature: {
                    Feature: function(node) {
                        var pos = node.label.indexOf('_');
                        var label = (pos > 0 ? node.label.slice(0, pos) : node.label);
                        label = (label == 'GisticArm' ? "Arm " + node.label.split('_')[1] : label);
                        return label;
                    },
                    Source: function(node) {
                        return re.label_map[node.source];
                    },
                    'Location': function(node) {
                        return 'Chr' + node.chr + ' ' + node.start + (node.end == '' ? '' : '-' + node.end) + ' ';
                    },
                    Annotations: parseAnnotationList
                },
                unlocated_feature : {},
                karyotype_feature: {},
                edge: {},
                link_objects: [
                    {
                        label: 'Pubcrawl',
                        url: 'http://explorer.cancerregulome.org/pubcrawl/',
                        uri: '?term=fbxw7&dataset=gbm_1031',
                        config_object: function(feature) {
                            return 'http://explorer.cancerregulome.org/pubcrawl/?term='+feature.label+'&dataset=' + re.tables.current_data;
                        }
                    }, //pubcrawl
                    {
                        label: 'UCSC Genome Browser',
                        url: 'http://genome.ucsc.edu/cgi-bin/hgTracks',
                        uri: '?db=hg18&position=chr',
                        config_object: function(feature) {
                            return 'http://genome.ucsc.edu/cgi-bin/hgTracks?db=hg18&position=chr' + feature.chr + ':' + feature.start + (feature.end == '' ? '' : '-' + feature.end);
                        }
                    }, //ucsc_genome_browser
                    {
                        label: 'Ensemble',
                        url: 'http://uswest.ensembl.org/Homo_sapiens/Location/View',
                        uri: '?r=',
                        config_object: function(feature) {
                            return 'http://uswest.ensembl.org/Homo_sapiens/Location/View?r=' + feature.chr + ':' + feature.start + (feature.end == '' ? '' : '-' + feature.end);
                        }
                    }, //ensemble
                    {
                        label: 'Cosmic',
                        url: 'http://www.sanger.ac.uk/perl/genetics/CGP/cosmic',
                        uri: '?action=bygene&ln=',
                        config_object: function(feature) {
                            return ['CNVR', 'MIRN','METH'].indexOf(feature.source) < 0 ? 'http://www.sanger.ac.uk/perl/genetics/CGP/cosmic?action=bygene&ln=' + feature.label : null;
                        }
                    },  {
                        label: 'NCBI',
                        url: 'http://www.ncbi.nlm.nih.gov/gene/',
                        uri: '',
                        selector : Ext.DomQuery.compile('a[href*=zzzZZZzzz]'),
                        config_object: function(feature) {
                            return 'http://www.ncbi.nlm.nih.gov/gene?term='+feature.label;                      
                    }
                }, {
                    label: 'miRBase',
                    url: 'http://mirbase.org/cgi-bin/query.pl',
                    uri: '?terms=',
                    config_object: function(feature) {
                        return feature.source == 'MIRN' ? 'http://www.mirbase.org/cgi-bin/query.pl?terms=' + feature.label : null;
                    }
                }
                   ],
                //link_objects
                edge_links: new Object(null),
                feature_links : new Object(null)
            },
            ticks: {
                tick_overlap_distance: null,
                tile_ticks_manually: false,
                wedge_width: 1,
                wedge_width_manually: false,
                wedge_height: 1,
                wedge_height_manually: false
            },
            network: {
                tile_nodes: false,
                node_overlap_distance: null
            },
            width: 800,
            height: 800,
            ring_radius: 55,
            rotation: 0,
            chrom_keys: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "X", "Y"]
        },
        cytoscape: {
            frame_ready: false,
            ready: false,
            layout: 'force_directed'
        }
    },
    circvis_obj: {},
    cytoscape: {
        obj: {},
        data: [],
        swfPath: "/cytoscape_web/1.0/swf/CytoscapeWeb",
        flashInstallerPath: "/cytoscape_web/1.0/swf/playerProductInstall"
    },
    plot: {
        locatable_source_list: ['GEXP', 'CNVR', 'MIRN' ],
        unlocatable_source_list: ['CLIN', 'METB_Serum', 'METB_Urine'],
        link_sources_array: [],

        colors: {
            link_type_colors: pv.colors("#c2c4ff", "#e7cb94", "#cedb9c", "#e7969c", "#e1daf9", "#b8e2ef"),
            link_sources_colors: {},
            source_color_scale: pv.Colors.category10(),
            stroke_style_attribute: 'white',
            getStrokeStyleAttribute: function() {
                return re.plot.colors.stroke_style_attribute;
            },
            setStrokeStyleAttribute: function(attr) {
                re.plot.colors.stroke_style_attribute = attr;
            },
           
            categorical_values: {
                        'NA' :'#444444',
                        '0': '#1f77b4', //blue
                        '1': '#ff7f0e',  //orange
           },
           category_colors : [
              '#2ca02c',        
                '#9467bd',
                '#d62728',
                '#8c564b',
                '#e377c2',
                '#7f7f7f',
                '#bcbd22',
                "#c2c4ff", 
                "#e7cb94", 
                "#cedb9c", 
                "#e7969c", 
                "#e1daf9", 
                "#b8e2ef"
            ]
        },
        inter_scale: pv.Scale.linear(0.00005, 0.0004).range('lightpink', 'red'),
        linear_unit: 100000,
        chrome_length: [],
        legend: {}, 
        scatterplot_data: null,
        default_colorby_feature_alias: '',
         category_equivalents :{
                'NEG': '0' ,
                'NEGATIVE' : '0', 
                'TUMOR_FREE' : '0',
                'NO': '0',
                'POS': '1', 
                'POSITIVE' : '1', 
                'WITH_TUMOR' : '1',
                'YES': '1'
            }
    },
    ui: {
        filters: {
            single_feature: true,
            link_distance: true
        },
        chromosomes: [],
        dataset_labels: [],
        categorical_sources_map : {},

        // Removes heading and trailing whitespaces from a string
    getDatasetLabels: function() {
            return re.ui.dataset_labels;
        },
        setDatasetLabels: function(obj) {   
            re.ui.dataset_labels = obj;
        },
        current_pathway_members: [],
        getCurrentPathwayMembers: function() {
            return re.ui.current_pathway_members;
        },
        setCurrentPathwayMembers: function(obj) {
            re.ui.current_pathway_members = obj;
        },
        pathway_members_query_counts: {},
        getPathwayMembersQueryCounts: function() {
            return re.ui.pathway_members_query_counts;
        },
        setPathwayMembersQueryCounts: function(obj, ct) {
            re.ui.pathway_members_query_counts[obj] = ct;
        },
	    pathway_bar_mouseover_behavior: {},
	    getPathwayBarBehavior: function() {
            return re.ui.pathway_bar_mouseover_behavior;
        },
        setPathwayBarBehavior: function(obj) {
            re.ui.pathway_bar_mouseover_behavior = obj;
        },
	    pathway_bar_mouseover_behavior_reset: {},
        getPathwayBarBehaviorReset: function() {
            return re.ui.pathway_bar_mouseover_behavior_reset;
        },
        setPathwayBarBehaviorReset: function(obj) {
            re.ui.pathway_bar_mouseover_behavior_reset = obj;
        },
        /*
         *        Order combo list
         *          Objects consist of fields:
         *               value: - String - id to be passed to controller
         *               label - String - id to be used by UI
         */
        limit_list: [{
            value: 10,
            label: '10'
        }, {
            value: 20,
            label: '20'
        }, {
            value: 40,
            label: '40'
        }, {
            value: 100,
            label: '100'
        }, {
            value: 200,
            label: '200'
        }, {
            value: 1000,
            label: '1000'
        }, {
            value: 2000,
            label: '2000'
        }],
        /*
         *        Limit combo list
         *          Objects consist of fields:
         *               value: - String - id to be passed to controller
         *               label - String - id to be used by UI
         */
        order_list: []
    },

    /*
     Window handles
     global handles to the masks and windows used by events
     */

    windows: {
        details_window: null,
        helpWindowReference: null,
        masks: {
            details_window_mask: null,
            network_mask: null
        }
    },
    data: {
        parsed_data: {
            network: null,
            unlocated: null,
            features: null,
            unlocated_features: null,
            located_features: null
        },
        responses: {
            network: null
        },
        patients: {
            data: null
        }
    }
});


(function() {
    re.ui.chromosomes.push({
        value: '*',
        label: 'All'
    });
    for (var i = 1; i <= 22; i++) {
        re.ui.chromosomes.push({
            value: i + '',
            label: i + ''
        });
    }
    re.ui.chromosomes.push({
        value: 'X',
        label: 'X'
    });
    re.ui.chromosomes.push({
        value: 'Y',
        label: 'Y'
    });

    /*
     Label map
     Hash maps feature type id to feature type label
     */
    re.label_map = {
        '*': 'All',
        'GEXP': 'Gene Expression',
        'CNVR': 'Somatic Copy Number',
        'CLIN': 'Clinical',
        'MIRN': 'MicroRNA Expression',
        'METB_Urine': 'Metabolic - Urine',
        'METB_Serum': 'Metabolic - Serum'
    };
    re.plot.all_source_list = pv.blend([re.plot.locatable_source_list, re.plot.unlocatable_source_list]);
    re.plot.all_source_map = pv.numerate(re.plot.all_source_list);
    re.plot.locatable_source_map = pv.numerate(re.plot.locatable_source_list);

    re.plot.proximal_distance = 2.5 * re.plot.linear_unit;

    re.plot.colors.features = {
        'GEXP': '#1f77b4',
        //blue
        'METH': '#2ca02c',
        //green
        'CNVR': '#ff7f0e',
        //orange
        'MIRN': '#9467bd',
        //purple
        'METB_Urine': '#d62728',
        //red
        'METB_Serum': '#8c564b',
        //pink
        'RPPA': '#e377c2',
        //brown
        'CLIN': '#7f7f7f',
        'SAMP': '#bcbd22'
        //#17becf
    };

    re.plot.legend.dataRingTypes = ['1. Cytoband','2. Gene Expression','3. Methylation','4. Copy Number','5. Unmapped Associations'];
    re.plot.colors.quants = {"Q1":"#000099", "Q2":"#66A3FF","Q3":"#959595","Q4":"#FF8080","Q5":"#800000"};
    re.plot.colors.quantinfo = {"Q1":"<5%", "Q2":"5-25%","Q3":"25-75%","Q4":"75-95%","Q5":">95%"};//,"Q6":"90-95%","Q7":">95%"};

    re.plot.colors.node_colors = function(source) {
        if (source in re.plot.colors.features) {
            return pv.color(re.plot.colors.features[source]);
        }
        return "blue";
    };
    re.model.association.types.forEach(function(obj) {
        re.ui.order_list.push({
            value: obj.id,
            label: obj.label
        });
    });

    if (re.analysis.directed_association) {
        re.ui.feature1 = {
            label: 'Target',
            id: 'target'
        };
        re.ui.feature2 = {
            label: 'Predictor',
            id: 'predictor'
        };
    } else {
        re.ui.feature1 = {
            label: 'Feature 1',
            id: 'feature1'
        };
        re.ui.feature2 = {
            label: 'Feature 2',
            id: 'feature2'
        };
    }

    re.build_tooltips();

})();