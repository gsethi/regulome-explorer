function registerLayoutListeners() {
    var d = vq.events.Dispatcher;
    d.addListener('data_ready', 'dataset_labels', function(obj) {
        loadListStores(obj);
        // resetFormPanel();
        checkFormURL();
        rectifyForm();
        if (invalidFilter()) {return;}
        requestFilteredData();
        re.state.once_loaded = true;
    });
    d.addListener('load_fail', 'associations', function(obj) {
        Ext.Msg.alert('Query failed', obj.msg);
        re.windows.masks.network_mask.hide();
    });
    d.addListener('query_fail', 'associations', function(obj) {
        Ext.Msg.alert('Query failed', obj.msg);
        re.windows.masks.network_mask.hide();
    });
    d.addListener('click_association', function(link) {
        openDetailsWindow(link);
    });
    d.addListener('data_ready', 'features', function(obj) {
        renderScatterPlot(obj);
        re.windows.masks.details_window_mask.hide();
    });
    d.addListener('data_ready', 'annotations', function(obj) {
        loadDataset();
    });
    d.addListener('render_complete', 'circvis', function(circvis_plot) {
        re.state.query_cancel = false;
        exposeCirclePlot();
    });
    d.addListener('graph_ready', 'graph', function(data) {
        if (Ext.getCmp('view-region').layout.activeItem.id == 'network-panel') {
            requestGraphRender();
        }
    });
    d.addListener('data_ready', 'associations', function(data) {
        loadDataTableStore(data);
        updateFilterPanel();
    });
    d.addListener('data_ready', 'sf_associations', function(data) {
        loadDataTableStore(data);
        if (Ext.getCmp('view-region').layout.activeItem.id == 'network-panel') {
            Ext.getCmp('view-region').layout.setActiveItem('rf-graphical');
        }
    });
    d.addListener('render_complete', 'linear', function(obj) {
        exposeLinearPlot(obj);
        enableLinearExport();
    });
    d.addListener('render_complete', 'scatterplot', function(obj) {
        scatterplot_obj = obj;
    });
    d.addListener('query_complete', 'label_position', function(obj) {
        completeLabelLookup(obj);
    });
    d.addListener('query_fail', 'label_position', function(obj) {
        failedLabelLookup(obj);
    });
    d.addListener('query_fail', 'features', function(obj) {
        Ext.Msg.alert('Query failed', obj.msg);
        re.windows.masks.details_window_mask.hide();
        re.windows.details_window.hide();
    });
    d.addListener('query_cancel', 'associations', function(data) {
        re.state.query_cancel = true;
    });
}


/*
 URL-based Form manipulation
 */


window.onpopstate = function(event) {
    if (re.state.once_loaded) {
        loadDataset();
    }
};

function extractURL() {
    var json = null;
    var url = location.search;
    if (url.length > 1) json = Ext.urlDecode(url.slice(1));
    return json;
}

function isDatasetURLSpecified() {
 var json = extractURL();
    if (json != null && json.dataset !== undefined) {
        return true;
    }
    return false;
}

function isHiddenDatasetURLSpecified() {
    var json = extractURL();
    if ( json != null && json.dataset !== undefined && json.hidden == "true" ) {
        return true;
    }
    return false;
}

function checkDatasetURL() {
    var json = extractURL();
        re.analysis.hidden = false;
    if (isDatasetURLSpecified()) {
        var exists = selectDatasetByLabel(json.dataset);
        if (isHiddenDatasetURLSpecified() ) {
            re.analysis.hidden = true;
            if (!exists) {
                insertDatasetToStore(json.dataset);
                selectDatasetByLabel(json.dataset);
            }
        }
    }
}

function rectifyForm() {
 ['t', 'p'].forEach(function(f) {
        if (Ext.getCmp(f+'_clin').isVisible()) {
            var value = Ext.getCmp(f+'_label').getValue();
            Ext.getCmp(f+'_clin').setValue(value || '*',true);
            Ext.getCmp(f+'_label').setValue('',true);
        }
    });
    //if pathway is selected on either form panel
  ['t'].forEach(function(f) {
    var combo = Ext.getCmp(f+'_pathway');
        if (combo.isVisible()) {
            var value = combo.getValue();
            var record = combo.findRecord(combo.valueField, value);
            var id = f === 't' ? re.ui.feature1.id : re.ui.feature2.id;
            pathwaySelection(record,id, f);
        }
    });
}

function checkFormURL() {
    var json = extractURL();
    if (json != null) setFormState(json);
}

function setFormState(json) {   
    Ext.iterate(json, setComponentState)
}

function setComponentState(key, value) {
    var field = Ext.getCmp(key);
    if (field !== undefined && 'setValue' in field) {
        Ext.getCmp(key).setValue(value, true);
    }
    if (key.indexOf('_pathway') >= 0) {
        field.setVisible(true);
        Ext.getCmp(key[0] + '_label').setVisible(false);
    }
}

function getURI() {
    return location.protocol + '//' + location.href;
}

function removeDefaultValues(json) {
    //remove default clinical label values.  They've already been copied to the label field
    ['t', 'p'].forEach(function(f) {
        if (Ext.getCmp(f+'_clin').isVisible()) {
            if (json[f + '_label'] == Ext.getCmp(f + '_clin').defaultValue) {
                delete json[f + '_label'];
            }
        }
    });
    //remove all of the other default value fields
    for (var i in json) {
        if (json[i] == null || json[i] == Ext.getCmp(i).defaultValue) {
            delete json[i];
        }
    }
    return json;
}

function removeDisabledValues(json){
    if (!Ext.getCmp('cis').checked){
        delete json['cis_distance_fn'];
        delete json['cis_distance_value'];
    }
    return json;
}

function fixPathwayValues(json) {
    if (Ext.getCmp('t_pathway').isVisible()){
        delete json['t_label'];
        json['t_type'] = "Pathway";
    }

    return json;
}

function generateStateJSON() {
    var json = getFilterSelections();
    //don't preserve empty or obvious values
    json = removeDefaultValues(json);
    json = removeDisabledValues(json);
    json = fixPathwayValues(json);
    var obj = {};
    var dataset = getSelectedDatasetLabel();
    if(dataset) obj.dataset = dataset;
    if (re.analysis.hidden === true) {
        obj.hidden = "true";
    } 
    obj = vq.utils.VisUtils.extend(obj, json);
    return obj;
}

function generateStateURL() {
    return getURI() + '?' + Ext.urlEncode(generateStateJSON());
}

function preserveState() {
    window.history.pushState(generateStateJSON(), '', '?' + Ext.urlEncode(generateStateJSON()));
}


/*
 Window manipulation
 */

function hideDatasetWindow() {
    re.windows.dataset_window.hide();
}

/*
 hide mask after scatterplot dispatches a 'completion' event?
 */

function openDetailsWindow(association) {
    re.windows.details_window.show();
    re.windows.masks.details_window_mask = new Ext.LoadMask('details-window', {
        msg: "Loading Data..."
    });
    re.windows.masks.details_window_mask.show();
    renderMedlineDocuments(association);
}

function retrieveSVG(parent_panel) {
    var serializer = new XMLSerializer();
    var svg_tags;
    var panel_dom = Ext.DomQuery.selectNode('div#' + parent_panel + '>svg');
    //!important for web browsers that attempt to render the image after export.
    panel_dom.setAttribute('xmlns', "http://www.w3.org/2000/svg");
    if (panel_dom !== undefined) {
        svg_tags = serializeSVG(panel_dom);
    }
    return svg_tags;
}

function exportImage() {
    var parent_panel = 'circle-panel';
    if (this.parentMenu.parentMenu.activeItem.id == 'linear-export-menu') parent_panel = 'linear-panel';
    var svg = retrieveSVG(parent_panel);
    if (svg === undefined) {
        Ext.Msg.alert('SVG does not exist', 'SVG cannot be exported.');;
        return;
    }
    if (this.value == 'svg') downloadData(svg, 'export.svg', 'svg');
    else convertData(svg, 'export.svg', 'svg', this.value);
}

function exportCytoscape() {
//    var parent_panel = 'cytoscape-panel';
    if (re.cytoscape.obj.initialized == null){
        Ext.Msg.alert("Export error", "Network tab/image is not initialized");
        return;
    }
    var svg = re.cytoscape.obj.svg();
    if (svg === undefined) {
        Ext.Msg.alert('SVG does not exist', 'SVG cannot be exported.');;
        return;
    }
    downloadData(svg, "re_cytoscapeweb_" + re.tables.current_data + ".svg", 'svg');
}

function loadDataDialog() {
    re.windows.dataset_window.show();
    Ext.getCmp('dataset-grid').store.load();
}


function exportScatterplotData(format) {
    convertData(retrieveFeatures(), re.tables.current_data + '_features','json', format);
}

function retrieveFeatures() {
    var data = re.plot.scatterplot_data;
    var f1 = data.f1alias, f2 = data.f2alias;
    var columns = ['id'].concat(re.ui.getDatasetLabels()['patients']);
    var rows = [[f1].concat(data.f1values),[f2].concat(data.f2values)];
    if (re.plot.scatterplot_category ) {
        var category = [re.plot.scatterplot_category.alias].concat(re.plot.scatterplot_category.values);
        rows = rows.concat([category]);
    }
    return Ext.encode([columns].concat(rows));
}

function exportData() {
    convertData(retrieveEdges(), 'data_table', 'json', this.value);
}

function retrieveEdges() {
    var colModel = Ext.getCmp('data_grid').getColumnModel();
    var id_list = colModel.columns.map(function(col) {
        return col.id;
    });
    id_list = id_list.filter(function(id) { return id.indexOf('info_') !== 0; });
    return Ext.encode( //make into JSON
        [id_list].concat( //append headers first
            Ext.StoreMgr.get('data_grid_store').getRange() //grab all records from last query
                .map(function(record) { //change each record in array
                    return id_list.map(function(id) { //into an array of values based on column id
                        return record.data[id];
                    });
                })));
}

function openHelpWindow(subject, text) {
    if (re.windows.helpWindowReference == null || re.windows.helpWindowReference.closed) {
        re.windows.helpWindowReference = window.open('', 'help-popup', 'width=400,height=300,resizable=1,scrollbars=1,status=0,' + 'titlebar=0,toolbar=0,location=0,directories=0,menubar=0,copyhistory=0');
    }
    re.windows.helpWindowReference.document.title = 'Help - ' + subject;
    re.windows.helpWindowReference.document.body.innerHTML = '<b>' + subject + '</b><p><div style=width:350>' + text + '</div>';
    re.windows.helpWindowReference.focus();
}

function openBrowserWindow(url, width, height) {
    var w = width || 640,
        h = height || 480;
    window.open(url, 'help-popup', 'width=' + w + ',height=' + h + ',resizable=1,scrollbars=1,status=0,' + 'titlebar=0,toolbar=0,location=0,directories=0,menubar=0,copyhistory=0');
}

function openBrowserTab(url) {
    var new_window = window.open(url, '_blank');
    new_window.focus();
}

function pathwaySelection(record, feature_id, prefix) {
    var prefix = prefix || 't';
    Ext.getCmp("filter_type").setValue(feature_id);
    record.json.label = record.json.label.replace('\\r', '');
    Ext.getCmp(prefix + '_label').setValue(record.json.label);
    Ext.getCmp('limit').setValue('25');
                                re.ui.setCurrentPathwayMembers(record.json.label);
                                var memberDataArray = [];
    var memberTokens = (record.json.label).split(",").sort();
    for (var tk = 0; tk<memberTokens.length; tk++){
        var mjson = {};
        var member = memberTokens[tk];
        if (member == null || member == "")
            continue;
        mjson["pmember"] = member;
        mjson["display_count"] = Math.floor(5*Math.random());
        mjson["hidden_count"] = Math.floor(10*Math.random());
        memberDataArray.push(mjson);
        loadFeaturesInAFM(member);
    }
    renderPathwayMembers('below-top-right');
    var url = record.json.value;
    if (record.json.url != null && record.json.url.length > 1)
        url = "<a href='" + record.json.url + "' target='_blank'>" + record.json.value  + "</a> ";
                    Ext.getCmp("pathway_member_panel").setTitle(url + " " + memberDataArray.length + " Genes");
}

/*
 Filters
 */

function invalidIsolateRequest(request_obj) {
    var invalid = true;
    if (request_obj.t_type == 'CLIN' && request_obj.t_label != '*') {
        invalid = false;
    } else if (request_obj.t_label != '' && request_obj.t_label.indexOf('*') < 0 && request_obj.t_label.indexOf('%') < 0) {
        invalid = false;
    }
    return invalid;
}

function invalidFeatureFilterCheck() {

    //make sure labels are defined for a filter query
    if ( (!Ext.getCmp('t_clin').isVisible() && (Ext.getCmp('filter_type').getValue() === re.ui.feature1.id && Ext.getCmp('t_label').getValue().length  === 0)) || 
        (Ext.getCmp('t_clin').isVisible() && (Ext.getCmp('filter_type').getValue() === re.ui.feature1.id && Ext.getCmp('t_clin').getValue().length  === 0)) ||
        (!Ext.getCmp('t_clin').isVisible() && (Ext.getCmp('filter_type').getValue() === re.ui.feature2.id && Ext.getCmp('p_label').getValue().length === 0)) || 
        (Ext.getCmp('t_clin').isVisible() && (Ext.getCmp('filter_type').getValue() === re.ui.feature2.id && Ext.getCmp('p_clin').getValue().length === 0))) {
        Ext.Msg.alert('Invalid Request', 'At least one feature label must be specified for the filtered feature.');
        return true;
    }
    return false;
}

function invalidFilter() {
        //make sure a label is defined for feature isolation query
    if (Ext.getCmp('isolate').checked && invalidIsolateRequest(getFilterSelections())) {
        Ext.Msg.alert('Invalid Request', 'An exact feature label must be specified.');
        return true;
    }
    //make sure labels are defined for a filter query
    if (invalidFeatureFilterCheck()) {
        return true;
    }
    return false;
}

function manualFilterRequest() {
   
    //make sure labels are defined for a filter query
    if (invalidFilter()) {
        return;
    }

    re.state.query_cancel = false;
    re.display_options.cytoscape.ready = false;
    preserveState();
    requestFilteredData();
}

function requestFilteredData() {
    vq.events.Dispatcher.dispatch(new vq.events.Event('data_request', 'associations', getFilterSelections()));
    prepareVisPanels();
}

/*
 getFilterSelections
 gathers the selections of each filter widget, packs it into a single object, and returns it
 easier to consume by event listeners, hopefully?
 */

function getFilterSelections() {
    var type_1 = Ext.getCmp('t_type').getValue();
    var label_1=Ext.getCmp('t_label').getValue();

    if (Ext.getCmp('t_clin').isVisible()) {
        label_1 = Ext.getCmp('t_clin').getValue();
    } else if (type_1 === 'Pathway') {
        type_1 = "*";
    }

    var type_2 = Ext.getCmp('p_type').getValue();
    var label_2=Ext.getCmp('p_label').getValue();

    if (Ext.getCmp('p_clin').isVisible()) {
        label_2 = Ext.getCmp('p_clin').getValue();
    } 

    return packFilterSelections(
        type_1, label_1, Ext.getCmp('t_chr').getValue(), Ext.getCmp('t_start').getValue(), Ext.getCmp('t_stop').getValue(),
        type_2, label_2, Ext.getCmp('p_chr').getValue(), Ext.getCmp('p_start').getValue(), Ext.getCmp('p_stop').getValue(),
        Ext.getCmp('order').getValue(), Ext.getCmp('limit').getValue(), Ext.getCmp('filter_type').getValue(),
        Ext.getCmp('isolate').checked,
            Ext.getCmp('cis').checked,
            Ext.getCmp('trans').checked,
            Ext.getCmp('cis_distance_value').getValue(),
            Ext.getCmp('cis_distance_fn').getValue(),
            Ext.getCmp('t_label_desc').getValue(),
            Ext.getCmp('p_label_desc').getValue(),
            Ext.getCmp('t_pathway').getValue()
        );
}


function packFilterSelections() {
    var return_obj = {
        t_type: arguments[0] || '',
        t_label: arguments[1] || '',
        t_chr: arguments[2] || '',
        t_start: arguments[3] || '',
        t_stop: arguments[4] || '',
        p_type: arguments[5] || '',
        p_label: arguments[6] || '',
        p_chr: arguments[7] || '',
        p_start: arguments[8] || '',
        p_stop: arguments[9] || '',
        order: arguments[10],
        limit: arguments[11],
        filter_type: arguments[12],
        isolate: arguments[13],
        cis: arguments[14],
        trans: arguments[15],
        cis_distance_value: arguments[16],
        cis_distance_fn: arguments[17],
        t_label_desc: arguments[18],
        p_label_desc: arguments[19],
        t_pathway: arguments[20] || ''
    };

    re.model.association.types.forEach(function(obj) {
        if (Ext.getCmp(obj.id) === undefined) {
            return;
        }
        if (obj.ui.filter.component instanceof re.multirangeField) {
            return_obj[obj.id + '_value']  = Ext.getCmp(obj.id + '_value').getValue();
            return_obj[obj.id + '_fn'] = Ext.getCmp(obj.id + '_fn').getValue();
        } else{
        return_obj[obj.id] = Ext.getCmp(obj.id).getValue();
    }
    });
    return return_obj;
}


function resetFormPanel() {
    Ext.getCmp('t_type').setValue(Ext.getCmp('t_type').defaultValue), Ext.getCmp('t_label').reset(), 
    Ext.getCmp('t_chr').reset(), Ext.getCmp('t_clin').reset(), Ext.getCmp('t_start').reset(), Ext.getCmp('t_stop').reset(), 
    Ext.getCmp('p_type').setValue(Ext.getCmp('p_type').defaultValue), Ext.getCmp('p_label').reset(), Ext.getCmp('p_chr').reset(), Ext.getCmp('p_clin').reset(), 
    Ext.getCmp('p_start').reset(), Ext.getCmp('p_stop').reset(), 
    Ext.getCmp('order').reset(), Ext.getCmp('limit').reset(), Ext.getCmp('filter_type').reset(),
    Ext.getCmp('t_pathway').reset(),
    Ext.getCmp('t_pathway').setVisible(false),Ext.getCmp('t_clin').setVisible(false),Ext.getCmp('p_clin').setVisible(false);
    Ext.getCmp('t_label').setVisible(true); Ext.getCmp('p_label').setVisible(true);

    re.model.association.types.forEach(function(obj) {
        if (Ext.getCmp(obj.id) === undefined) {
            return;
        }
        Ext.getCmp(obj.id).reset();
        if (obj.ui.filter.component instanceof re.multirangeField) {
            Ext.getCmp(obj.id + '_fn').reset();
        }
    });
    Ext.getCmp("pathway_member_panel").setTitle("Pathways/Groupings");
}

function updateFilterPanel() {
     // if f1 has a label value and f1 is a list
                    if (Ext.getCmp('t_pathway').getValue() !== '' && Ext.getCmp('t_label').getValue().indexOf(",") > -1) {
                        //set filter type to feature 1, assign pathway, expand panel
                        Ext.getCmp("filter_type").setValue(re.ui.feature1.id);
                        re.ui.setCurrentPathwayMembers(Ext.getCmp('t_label').getValue());
                        Ext.getCmp('pathway_member_panel').expand();
                    }
                }

/*
 should be called by an event listener
 */

function loadListStores(dataset_labels) {
    var labels = dataset_labels['feature_sources'].map(function(row) { return row.source;});
    var label_list = labels.map(function(l) {
        return {
            value: l,
            label: re.label_map[l] || l
        };
    });
    label_list.unshift({
        value: '*',
        label: 'All'
    });
    label_list.push({
        value: 'Pathway',
        label: 'Pathway'
    });

    var obj = re.plot.locatable_source_list.filter(function(b) { return labels.indexOf(b) >= 0 });
    var t_type = obj ? obj[0] : labels[0];
    Ext.StoreMgr.get('f1_type_combo_store').loadData(label_list);
    Ext.getCmp('t_type').setValue(t_type);
    Ext.getCmp('t_type').defaultValue = t_type;
    Ext.StoreMgr.get('f2_type_combo_store').loadData(label_list.filter(function (b){ return b.label !== 'Pathway'; }));
    Ext.getCmp('p_type').setValue("*");
    var label_map = {};
    var cat_feature_list = [
            {
                source: '*',
                value: '*',
                label: 'All',
                alias: '*',
                interesting_score: 999999999
            }
        ];

    dataset_labels['categorical_feature_labels'].forEach(function(row) {
        if (label_map[row.source] === undefined) {
            label_map[row.source] = 1;
        }
        cat_feature_list.push({
            source: row.source,
            value: escapeComma(row.label),
            label: re.functions.lookupFFN(row.alias),
            alias: row.alias,
            interesting_score: row.interesting_score
        });
    });
    re.ui.categorical_sources_map = label_map;
    re.ui.categorical_feature_list = cat_feature_list;
    
    var label_source_list = Object.keys(label_map);
    var feature_filter = (label_map['CLIN'])  ? 'CLIN' : label_source_list[0];
    if ( cat_feature_list.length > 0 ) {
        var list = re.ui.categorical_feature_list.filter(function(l) { return l.source === feature_filter || l.source ==='*';});
        Ext.StoreMgr.get('f1_clin_list_store').loadData(list, false);
        Ext.StoreMgr.get('f2_clin_list_store').loadData(list, false);
    }

    Ext.getCmp('t_clin').setValue('*');
    Ext.getCmp('t_clin').defaultValue = '*';
    Ext.getCmp('p_clin').setValue('*');
    Ext.getCmp('p_clin').defaultValue = '*';
   
    var pathway_list = dataset_labels['pathways'].map(function(row) {
        return {
            value: row.pname + ":" + row.psource,
            label: row.pmembers,
            url:   row.purl
        };
    });
    Ext.StoreMgr.get('f1_pathway_list_store').loadData(pathway_list);

    var scatterplot_categorical_features = cat_feature_list.filter( function(feature) {
        var type = feature.alias[0];
        return type === 'C' || type === 'B';
    });

    Ext.StoreMgr.get('categorical_feature_store').loadData(scatterplot_categorical_features);

    if (re.plot.default_colorby_feature_alias !== undefined) {
        Ext.getCmp('scatterplot_colorby_combobox').setValue(re.plot.default_colorby_feature_alias);
    } else {

    }

}

function loadDataTableStore(data) {
    var columns = ['datatype_b', 'pretty_label_b', 'chr_b', 'start_b'];
    var colModel = Ext.getCmp('data_grid').getColumnModel();
    var load_data = [];
    if (data['unlocated'] === undefined) {
        load_data = data['features'].map(function(node) {
            var obj = {
                id_a: node.id,
                datatype_a: node.source,
                pretty_label_a: node.pretty_label,
                label_a: node.label,
                chr_a: node.chr,
                start_a: node.start,
                end_a: node.end
            };
               if(re.ui.filters.link_distance) {
                obj['link_distance'] = node.link_distance;
            }
            re.model.association.types.forEach(function(assoc) {
                obj[assoc.ui.grid.store_index] = node[assoc.ui.grid.store_index];
            });
            return obj;
        });

        columns.forEach(function(col) {
            colModel.setHidden(colModel.getIndexById(col), true);
        });
    } else {
        load_data = pv.blend([data['network'], data['unlocated']]).map(function(row) {
            var obj = {
                id_a: row.node1.id,
                datatype_a: row.node1.source,
                pretty_label_a: row.node1.pretty_label,
                label_a: row.node1.label,
                chr_a: row.node1.chr,
                start_a: row.node1.start,
                end_a: row.node1.end,
                id_b: row.node2.id,
                datatype_b: row.node2.source,
                pretty_label_b: row.node2.pretty_label,
                label_b: row.node2.label,
                chr_b: row.node2.chr,
                start_b: row.node2.start,
                end_b: row.node2.end
            };
            if(re.ui.filters.link_distance) {
                obj['link_distance'] = row.link_distance;
            }
            re.model.association.types.forEach(function(assoc) {
                obj[assoc.ui.grid.store_index] = row[assoc.ui.grid.store_index];
            });
            return obj;
        });
        columns.forEach(function(col) {
            colModel.setHidden(colModel.getIndexById(col), false);
        });
    }
    
    var order = Ext.getCmp('order').getValue();
    var fn = Ext.getCmp(order + '_fn') ? Ext.getCmp(order + '_fn').getValue() : '';
    var config = re.model.association.types[re.model.association_map[order]];
    var store_index = config.ui.grid.store_index;
    var c,d;
    if(fn ==='Abs'){
          load_data.sort(function(a,b) {
            c = a[store_index];
            c = c >= 0 ? c : c * -1;
            d = b[store_index];
            d = d >= 0 ? d : d * -1;
            return d - c;
          });        
        } else {
    Ext.StoreMgr.get('data_grid_store').setDefaultSort(config.ui.grid.column.id,
                                                        (config.query.order_direction).toUpperCase()
                                                        );
    }
    Ext.StoreMgr.get('data_grid_store').loadData(load_data);

    return;
}

/*
 loadSelectedDataset
 should dispatch an event after validating dataset selection
 */

function loadDataset() {
    checkDatasetURL();
    if (!isDatasetURLSpecified()) {loadDataDialog(); return;}
    if (Ext.getCmp('dataset-grid').getSelectionModel().getSelected() === undefined) {
        Ext.Msg.alert('Valid Dataset not selected', 'Please choose a dataset to begin.',loadDataDialog);
        preserveState();
        return;
    }
    loadSelectedDataset();
}

function insertDatasetToStore(label) {
    var disease = label.slice(0, label.indexOf('_')).toUpperCase();
    var obj =  {
                description : "Hidden dataset",
                dataset_date : 'Now',
                label : label,
                method: 'hidden',
                source : 'Unknown source',
                disease : disease,
                contact : '',
                comments : ''
            };
    Ext.StoreMgr.get('dataset_grid_store').loadData(obj, true);
}



function selectDatasetByLabel(label) {
    var record_index = Ext.StoreMgr.get('dataset_grid_store').findExact('label', label);
    if (record_index >= 0) {
        Ext.getCmp('dataset-grid').getSelectionModel().selectRow(record_index);
        return true;
    }
    else {
        Ext.getCmp('dataset-grid').getSelectionModel().clearSelections(true);
        return false;
    }
}

function getSelectedDataset() {
    if (Ext.getCmp('dataset-tabpanel').layout.activeItem.id == 'dataset-tree' &&
        Ext.getCmp('dataset-tree').getSelectionModel().getSelectedNode() !== null &&
        re.analysis.hidden !== true ) {
        var label = Ext.getCmp('dataset-tree').getSelectionModel().getSelectedNode().attributes.label;
        var record_index = Ext.StoreMgr.get('dataset_grid_store').findExact('label', label);
        if (record_index >= 0) {
            Ext.getCmp('dataset-grid').getSelectionModel().selectRow(record_index);
        } 
    }
    return  Ext.getCmp('dataset-grid').getSelectionModel().getSelected();
}

function getSelectedDatasetDisease() {
    var selected_record = getSelectedDataset();
    var selected_dataset = null;
    if (selected_record != null) {
        selected_dataset = selected_record.json.disease;
    }
    return selected_dataset;
}

function getSelectedDatasetLabel() {
    var selected_record = getSelectedDataset();
    var selected_dataset = null;
    if (selected_record != null) {
        selected_dataset = selected_record.json.label;
    }
    return selected_dataset;
}

function getSelectedDatasetDescription() {
    var selected_record = getSelectedDataset();
    var selected_dataset = '';
    if (selected_record != null) {
        selected_dataset = selected_record.json.description;
    }
    return selected_dataset;
}


function manualLoadSelectedDataset() {
    re.analysis.hidden = false;
    preserveState();
    loadSelectedDataset();
}

function loadSelectedDataset() {
    var selected_dataset_label = getSelectedDatasetLabel();
    var selected_dataset_disease = getSelectedDatasetDisease();
    var selected_description = getSelectedDatasetDescription();
    if (selected_dataset_label != '') {
        vq.events.Dispatcher.dispatch(new vq.events.Event('dataset_selected', 'dataset-grid', {label: selected_dataset_label, disease: selected_dataset_disease}));
        hideDatasetWindow();
        Ext.getCmp('filter_parent').setTitle('Filtering \'' + selected_description + '\'');
    } else {
        Ext.Msg.alert('Dataset not selected', 'Select a dataset to load.');
    }
}

function completeLabelLookup(lookup_obj) {
    var feature = lookup_obj.feature || {};
    if (feature === {}) {
        return;
    }
    var ui = (lookup_obj.ui == 'f2' ? 'p' : 't');
    var chr_ui = Ext.getCmp(ui + '_chr');
    var start_ui = Ext.getCmp(ui + '_start');
    var end_ui = Ext.getCmp(ui + '_stop');
    var chr = feature.chr.slice(3);
    var start = Math.max(feature.start - 5000, 0);
    var stop = feature.end + 5000;
    chr_ui.setValue(chr);
    start_ui.setValue(start);
    end_ui.setValue(stop);
    var label_ui = Ext.getCmp(ui + '_label');
    label_ui.setValue('');
}

function failedLabelLookup() {
    var alert = Ext.Msg.alert('Failure ', 'Specified Gene Label was not found.', function() {
        task.cancel()
    });
    var task = new Ext.util.DelayedTask(function() {
        alert.hide();
    });
    task.delay(1300);
}

function requestGraphRender() {
    var e = new vq.events.Event('frame_ready', 'graph', {});
    e.dispatch();
}

/*
 renderScatterPlot
 should be wrapped in an event listener external to the ui layout code
 */
function renderScatterPlot() {
    var regression_type = Ext.getCmp('scatterplot_regression_radiogroup').getValue().getRawValue();
    var reverse_axes = Ext.getCmp('scatterplot_axes_checkbox').getValue();
    var discretize_x = Ext.getCmp('scatterplot_discrete_x_checkbox').getValue();
    var discretize_y = Ext.getCmp('scatterplot_discrete_y_checkbox').getValue();
    var event_obj = {
        div: document.getElementById('scatterplot_panel'),
        regression_type: regression_type,
        reverse_axes: reverse_axes,
        discretize_x: discretize_x,
        discretize_y: discretize_y
    };
    if (arguments.length == 1) //data passed into function
        event_obj['data'] = arguments[0];

    Ext.getCmp('details-tabpanel').layout.setActiveItem('scatterplot_parent');
    Ext.getCmp('scatterplot_parent').show();
    vq.events.Dispatcher.dispatch(
        new vq.events.Event('render_scatterplot', 'details', event_obj));
}

/*
 MEDLINE functions
 */

function renderMedlineDocuments(association) {
    var term1 = association.sourceNode.label;
    var term2 = association.targetNode.label;
    retrieveMedlineDocuments(term1, term2);
    Ext.StoreMgr.get('dataDocument_grid_store').load({
        params: {
            start: 0,
            rows: 20
        }
    });
}

function retrieveMedlineDocuments(term1, term2) {
    Ext.StoreMgr.get('dataDocument_grid_store').on({
        beforeload: {
            fn: function(store, options) {
                store.proxy.setUrl(re.databases.medline.uri + re.databases.medline.select + '?qt=distributed_select&q=%2Btext%3A\"' + term1 + '\" %2Btext%3A\"' + term2 + '\"&fq=%2Bpub_date_year%3A%5B1991 TO 2011%5D&wt=json' + '&hl=true&hl.fl=article_title,abstract_text&hl.snippets=100&hl.fragsize=50000&h.mergeContiguous=true&sort=pub_date_year%20desc');
            }
        }
    });
}

/*
 Grid Column rendering functions
 */

function renderPMID(value, p, record) {
    return String.format('<b><a href="http://www.ncbi.nlm.nih.gov/pubmed/{0}" target="_blank">{0}</a></b>', record.data.pmid);
}

function renderTitle(value, p, record) {
    var jsonData = record.store.reader.jsonData;
    if (jsonData.highlighting[record.id] != undefined && jsonData.highlighting[record.id].article_title != undefined) {
        return jsonData.highlighting[record.id].article_title[0];
    } else return record.data.article_title;
}

/*clean divs*/

function enableLinearExport() {
    Ext.getCmp('linear-export-menu').setDisabled(false);
}

function prepareVisPanels() {
    re.windows.masks.network_mask = new Ext.LoadMask('view-region', {
        msg: "Loading Data...",
        cancelEvent: function() {
            vq.events.Dispatcher.dispatch(
                new vq.events.Event('query_cancel', 'associations', {}));
        }
    });
    re.windows.masks.network_mask.show();
    wipeLinearPlot();
}

function wipeLinearPlot() {
    Ext.getCmp('linear-parent').setTitle('Chromosome-level View');
    document.getElementById('linear-panel').innerHTML = '';
    Ext.getCmp('linear-parent').collapse(true);
}

function exposeCirclePlot() {
    Ext.getCmp('circle-parent').expand(true);
    re.windows.masks.network_mask.hide();
}

function exposeLinearPlot(feature_obj) {
    Ext.getCmp('linear-parent').expand(true);
    Ext.getCmp('linear-parent').setTitle('Chromosome-level View: Chromosome ' + feature_obj.chr);
    var task = new Ext.util.DelayedTask(function() {
        var rf = Ext.getCmp('rf-graphical').body;
        var d = rf.dom;
        rf.scroll('b', d.scrollHeight - d.offsetHeight, true);
    });
    task.delay(300);
}

function openRFPanel() {
    loadDataLabelLists(function() {
        if (Ext.get('circle-panel').dom.firstChild.id !== "") {
            getFilterSelections();
        }
    });
}

function registerAllListeners() {
    registerLayoutListeners();
    registerDataRetrievalListeners();
    registerModelListeners();
    registerPlotListeners();
}

Ext.onReady(function() {
    Ext.QuickTips.init();
    Ext.Ajax.disableCaching = false;
    Ext.Ajax.defaultHeaders = {
        'Accept'         : 'application/json,application/xml',
        'Content-Type'   : 'application/json'
    };

    registerAllListeners();

    var randomforestPanel = new Ext.Panel({
        id: 'randomforest-panel',
        name: 'randomforest-panel',
        layout: 'border',
        frame: false,
        border: false,
        defaults: {
            bodyStyle: 'padding:5px',
            animFloat: false,
            floatable: false
        },
        items: [{
            region: 'center',
            id: 'view-region',
            xtype: 'tabpanel',
            border: false,
            activeTab: 0,
            deferredRender: false,
            items: [{
                xtype: 'panel',
                id: 'rf-graphical',
                layout: 'auto',
                title: 'Multi-Scale',
                autoScroll: 'true',
                items: [{
                    xtype: 'panel',
                    id: 'circle-parent',
                    layout: 'absolute',
                    height: 900,
                    width: 1050,
                    collapsible: true,
                    title: 'Genome-level View',
                    tools: [{
                        id: 'help',
                        handler: function(event, toolEl, panel) {
                            openHelpWindow('Genome-level View', re.help.strings.genomeLevelHelpString);
                        }
                    }],
                    items: [{
                        xtype: 'panel',
                        id: 'circle-panel',
                        width: 800,
                        x: 20,
                        y: 20,
                        html:'Select a Dataset to begin'
                    }, {
                        xtype: 'panel',
                        id: 'circle-legend-panel',
                        width: 150,
                        border: false,
                        frame: false,
                        x: 880,
                        y: 20
                    }, {
                        xtype: 'panel',
                        id: 'circle-colorscale-panel',
                        width: 150,
                        border: false,
                        frame: false,
                        x: 330,
                        y: 450
                    }]
                }, {
                    xtype: 'panel',
                    id: 'linear-parent',
                    layout: 'absolute',
                    height: 800,
                    width: 1050,
                    collapsible: true,
                    collapsed: true,
                    title: 'Chromosome-level View',
                    tools: [{
                        id: 'help',
                        handler: function(event, toolEl, panel) {
                            openHelpWindow('Chromosome-level View', re.help.strings.chromosomeLevelHelpString);
                        }
                    }],
                    items: [{
                        xtype: 'panel',
                        id: 'linear-panel',
                        width: 800,
                        x: 20,
                        y: 20,
                        html: 'For a Chromosome-level view of the data, select a point of focus from the Genome-level View.<p>' + 'Click on:' + '<ol><li>Chromosome Label</li><li>Tick Label</li>'
                    }, {
                        xtype: 'panel',
                        id: 'linear-legend-panel',
                        width: 150,
                        border: false,
                        frame: false,
                        x: 820,
                        y: 20
                    }]
                }]
            }, {
                xtype: 'panel',
                id: 'network-panel',
                name: 'network-panel',
                title: 'Network',
                autoScroll: false,
                layout: 'auto',
                monitorResize: true,
                collapsible: false,
                listeners: {
                    activate: function() {
                        requestGraphRender();
                    }
                },
                items: {
                    layout: 'fit',
                    items: {
                        xtype: 'panel',
                        id: 'graph-panel',
                        name: 'graph-panel'
                    }
                }
            }, {
                xtype: 'panel',
                id: 'grid-panel',
                name: 'grid-panel',
                title: 'Data Table',
                monitorResize: true,
                autoScroll: false,
                layout: 'fit',
                height: 650,
                width: 1050,
                collapsible: false,
                tools: [{
                    id: 'help',
                    handler: function(event, toolEl, panel) {
                        openHelpWindow('Data-level View', re.help.strings.dataLevelViewHelpString);
                    }
                }],
                items: [{
                    xtype: 'grid',
                    id: 'data_grid',
                    name: 'data_grid',
                    autoScroll: true,
                    monitorResize: true,
                    autoWidth: true,
                    height: 650,
                    viewConfig: {
                        forceFit: true
                    },
                    cm: new Ext.grid.ColumnModel({
                        columns: [{
                            header: "Id",
                            width: 40,
                            hidden: true,
                            id: 'id_a',
                            dataIndex: 'id_a'
                        }, {
                            width: 30,
                            align: 'center',
                            icon: '../images/icons/zoom.png',
                            id: 'info_a',
                            xtype: 'actioncolumn',
                            handler: function(grid, rowIndex, colIndex) {
                                 var record = grid.store.getAt(rowIndex);
                                 var fieldName = grid.getColumnModel().getColumnId(colIndex);
                                 var feature = fieldName.split('_')[1];
                                 var t = grid.getView().getCell(rowIndex,colIndex);
                                  var data = {
                                            source:record.json['datatype_' + feature],
                                            label:record.json['label_' + feature], chr:record.json['chr_' + feature],
                                            start:record.json['start_' + feature], end:record.json['end_' + feature] || ''
                                        };
                                        var hovercard = new vq.Hovercard(options(t));
                                        hovercard.show(t, data);
                            }
                        },{
                            header: "Label",
                            width: 80,
                            id: 'pretty_label_a',
                            dataIndex: 'pretty_label_a',
                            groupName: 'Target'
                        }, {
                            header: "Type",
                            width: 40,
                            id: 'datatype_a',
                            dataIndex: 'datatype_a',
                            groupName: 'Target'
                        }, {
                            header: "Chr",
                            width: 30,
                            id: 'chr_a',
                            dataIndex: 'chr_a',
                            groupName: 'Target'
                        }, {
                            header: "Start",
                            width: 70,
                            id: 'start_a',
                            dataIndex: 'start_a',
                            groupName: 'Target'
                        }, {
                            header: "End",
                            width: 70,
                            id: 'end_a',
                            dataIndex: 'end_a',
                            hidden: true,
                            groupName: 'Target'
                        }, {
                            header: "Id",
                            width: 40,
                            hidden: true,
                            id: 'id_b',
                            dataIndex: 'id_b'
                         }, {
                            width: 30,
                            align: 'center',
                            icon: '../images/icons/zoom.png',
                            id: 'info_b',
                            xtype: 'actioncolumn',
                            handler: function(grid, rowIndex, colIndex) {
                                 var record = grid.store.getAt(rowIndex);
                                 var fieldName = grid.getColumnModel().getColumnId(colIndex);
                                 var feature = fieldName.split('_')[1];
                                 var t = grid.getView().getCell(rowIndex,colIndex);
                                  var data = {
                                            source:record.json['datatype_' + feature],
                                            label:record.json['label_' + feature], chr:record.json['chr_' + feature],
                                            start:record.json['start_' + feature],  end:record.json['end_' + feature] || ''
                                        };
                                        var hovercard = new vq.Hovercard(options(t));
                                        hovercard.show(t, data);
                            }
                        },{
                            header: "Label",
                            width: 80,
                            id: 'pretty_label_b',
                            dataIndex: 'pretty_label_b',
                            groupName: 'Target'
                        }, {
                            header: "Type",
                            width: 40,
                            id: 'datatype_b',
                            dataIndex: 'datatype_b',
                            groupName: 'Target'
                        }, {
                            header: "Chr",
                            width: 40,
                            id: 'chr_b',
                            dataIndex: 'chr_b',
                            groupName: 'Target'
                        }, {
                            header: "Start",
                            width: 70,
                            id: 'start_b',
                            dataIndex: 'start_b',
                            groupName: 'Target'
                        }, {
                            header: "End",
                            width: 70,
                            id: 'end_b',
                            dataIndex: 'end_b',
                            hidden: true,
                            groupName: 'Target'
                        }
                        ].concat(re.ui.filters.link_distance ?
                               {
                            header: "Distance",
                            width: 50,
                            id: 'link_distance',
                            dataIndex: 'link_distance',
                            renderer: function(value) {
                                 return value >= 500000000 ? 'Inf' : value;
                                }
                            }  :
                            []
                            )
                            .concat(re.model.association.types.map(function(obj) {
                            if (obj.ui != null)
                                return obj.ui.grid.column;
                        })),
                        defaults: {
                            sortable: true,
                            width: 100
                        }
                    }),
                    store: new Ext.data.JsonStore({
                        autoLoad: false,
                        storeId: 'data_grid_store',
                        fields: ['id_a', 'datatype_a', 'pretty_label_a', 'chr_a', 'start_a', 'end_a',
                        'id_b', 'datatype_b', 'pretty_label_b', 'chr_b', 'start_b', 'end_b']
                        .concat( re.ui.filters.link_distance ? 'link_distance': [])
                        .concat(re.model.association.types.map(function(obj) {
                            return obj.ui.grid.store_index;
                        }))
                    }),
                    listeners: {
                        rowclick: function(grid, rowIndex, event) {
                            
                            var target = event.getTarget(null, null, true);
                            if (target.hasClass('x-action-col-icon')) {
                                    return;
                            }
                            var record = grid.getStore().getAt(rowIndex);
                            var link = {};
                            link.sourceNode = {};
                            link.targetNode = {};
                            link.sourceNode.id = record.get('id_a');
                            link.targetNode.id = record.get('id_b');
                            link.sourceNode.label = record.get('pretty_label_a');
                            link.targetNode.label = record.get('pretty_label_b');
                            //initiateDetailsPopup(link);
                            vq.events.Dispatcher.dispatch(new vq.events.Event('click_association', 'associations_table', link));
                        }
                        // mouseover: function (e,t) {
                        //     var row;
                        //      var col;
                        //     if((row = this.getView().findRowIndex(t)) !== false && (col = this.getView().findCellIndex(t)) != false ){
                        //         var record = this.store.getAt(row);
                        //         var fieldName = this.getColumnModel().getDataIndex(col);
                        //         // var anchor = this.getView().getCell(row+1, col+1) || this.getView().getCell(row+1, col-1) ||
                        //         //                 this.getView().getCell(row-5, colorscale_draw+1);
                                
                        //         var feature = fieldName.split('_')[0];
                        //         if(record.json[feature+'_id']===undefined) { return false;}
                        //         var data = {
                        //                     source:record.json[feature+'_source'],
                        //                     label:record.json[feature+'_label'], chr:record.json[feature+'_chr'],
                        //                     start:record.json[feature+'_start'], end:''
                        //                 };
                        //                 var hovercard = new vq.Hovercard(options(t));
                        //                 hovercard.show(t, data)

                        //     }
                        // }
                    }
                }]
            }]
        },
            re.ui.panels.east]
    });

var options = function(t) { return {        
            include_header : false,
            include_footer : true,
            include_frame : true,
            self_hover : false,
            timeout : 0,
            target : t,
            data_config : re.display_options.circvis.tooltips.feature,
            tool_config : re.display_options.circvis.tooltips.feature_links,
        };
    };
            


    new Ext.Viewport({
        layout: {
            type: 'border',
            padding: 5
        },
        defaults: {
            split: true
        },
        items: [{
            region: 'north',
            id: 'toolbar-region',
            collapsible: false,
            border: false,
            title: re.title || 'Multi-Scale Explorer',
            split: false,
            height: 27,
            layout: 'fit',
            tbar: [{
                id: 'dataMenu',
                text: 'Data',
                labelStyle: 'font-weight:bold;',
                menu: [{
                    text: 'Select',
                    handler: loadDataDialog
                }, {
                    text: 'Export',
                    menu: [{
                        text: 'CSV',
                        value: 'csv',
                        handler: exportData
                    }, {
                        text: 'TSV',
                        value: 'tsv',
                        handler: exportData
                    }, {
                        text: 'Circular',
                        id: 'circular-export-menu',
                        menu: [{
                            text: 'SVG',
                            value: 'svg',
                            handler: exportImage
                        // }, {
                        //     text: 'PNG',
                        //     value: 'png',
                        //     handler: exportImage
                        }]
                    }, {
                        text: 'Linear',
                        id: 'linear-export-menu',
                        disabled:true,
                        menu: [{
                            text: 'SVG',
                            value: 'svg',
                            handler: exportImage
                        // }, {
                        //     text: 'PNG',
                        //     value: 'png',
                        //     handler: exportImage
                        }]
                    }, {
                        text: 'Network',
                        id: 'network-export-menu',
                        handler: exportCytoscape
                    }]
                },
                org.cancerregulome.explorer.utils.GetGoogleDriveMenu()]
            }, {
                id: 'displayMenu',
                text: 'Display',
                labelStyle: 'font-weight:bold;',
                menu: [{
                    id: 'networkMenu',
                    text: 'Network',
                    labelStyle: 'font-weight:bold;',
                    menu: [{
                        checked: true,
                        text: 'Force Directed',
                        xtype: 'menucheckitem',
                        handler: networkLayoutHandler,
                        group: 'networklayout_group'
                    }, {
                        text: 'Radial',
                        xtype: 'menucheckitem',
                        handler: networkLayoutHandler,
                        checked: false,
                        group: 'networklayout_group'
                    }, {
                        text: 'Tree',
                        xtype: 'menucheckitem',
                        handler: networkLayoutHandler,
                        checked: false,
                        group: 'networklayout_group'
                    }]
                }, {
                    text: 'Circular Plot',
                    menu: [{
                        text: 'Outer Ticks:',
                        menu: [{
                            xtype: 'compositefield',
                            items: [{
                                xtype: 'checkbox',
                                id: 'tile_ticks_checkbox',
                                checked: false,
                                label: 'Specifiy Tick Tiling',
                                handler: function(checkbox, checked) {
                                    Ext.getCmp('tile_ticks_field').setDisabled(!checked);
                                    re.display_options.circvis.ticks.tile_ticks_manually = checked;
                                    re.display_options.circvis.ticks.tick_overlap_distance = Ext.getCmp('tile_ticks_field').getValue();
                                }
                            }, {
                                xtype: 'label',
                                text: 'Overlap Distance'
                            }, {
                                id: 'tile_ticks_field',
                                xtype: 'numberfield',
                                width: 75,
                                value: '7200',
                                minValue: -2,
                                maxValue: 20000000.0,
                                disabled: true,
                                listeners: {
                                    change: function(field, value) {
                                        re.display_options.circvis.ticks.tick_overlap_distance = value;

                                    }
                                }
                            }, {
                                xtype: 'label',
                                text: 'bp'
                            }],
                            text: 'Tile Overlap',
                            width: 220
                        }, {
                            xtype: 'compositefield',
                            width: 240,
                            items: [{
                                xtype: 'checkbox',
                                id: 'tick_wedge_height_manually',
                                checked: false,
                                label: 'Wedge Height',
                                handler: function(checkbox, checked) {
                                    Ext.getCmp('circvis_tick_wedge_height').setDisabled(!checked);
                                    re.display_options.circvis.ticks.wedge_height_manually = checked;
                                    re.display_options.circvis.ticks.wedge_height = Ext.getCmp('circvis_tick_wedge_height').getValue();
                                }
                            }, {
                                xtype: 'label',
                                text: 'Wedge Height'
                            }, {
                                id: 'circvis_tick_wedge_height',
                                xtype: 'numberfield',
                                minValue: 1,
                                maxValue: 30,
                                value: 10,
                                width: 75,
                                disabled: true,
                                listeners: {
                                    change: function(field, value) {
                                        re.display_options.circvis.ticks.wedge_height = value;
                                    }
                                }
                            }, {
                                xtype: 'label',
                                text: 'pixels'
                            }]
                        }, {
                            xtype: 'compositefield',
                            width: 240,
                            items: [{
                                xtype: 'checkbox',
                                id: 'tick_wedge_width_manually',
                                checked: false,
                                label: 'Wedge Width',
                                handler: function(checkbox, checked) {
                                    Ext.getCmp('circvis_tick_wedge_width').setDisabled(!checked);
                                    re.display_options.circvis.ticks.wedge_width_manually = checked;
                                    re.display_options.circvis.ticks.wedge_width = Ext.getCmp('circvis_tick_wedge_width').getValue();
                                }
                            }, {
                                xtype: 'label',
                                text: 'Wedge Width'
                            }, {
                                id: 'circvis_tick_wedge_width',
                                xtype: 'numberfield',
                                minValue: 0.1,
                                maxValue: 360,
                                value: 0.5,
                                width: 75,
                                disabled: true,
                                listeners: {
                                    change: function(field, value) {
                                        re.display_options.circvis.ticks.wedge_width = value;
                                    }
                                }
                            }, {
                                xtype: 'label',
                                text: 'degrees'
                            }]
                        }]
                    }, {
                        text: 'Rotate Clockwise',
                        menu: [{
                            xtype: 'compositefield',
                            width: 140,
                            items: [{
                                id: 'circvis_rotation_degrees',
                                xtype: 'numberfield',
                                minValue: 0,
                                maxValue: 360,
                                value: 0,
                                width: 75,
                                listeners: {
                                    change: function(field, value) {
                                        re.display_options.circvis.rotation = value;
                                    }
                                }
                            }, {
                                xtype: 'label',
                                text: 'degrees'
                            }]
                        }]
                    }]
                }, {
                    id: 'circularScatterplotMenu',
                    text: 'Scatterplot',
                    menu: [{
                        text: 'Association',
                        labelStyle: 'font-weight:bold;',
                        menu: re.model.association.types.map(function(obj, index) {
                            var return_obj = {
                                text: obj.label,
                                value: obj.id,
                                xtype: 'menucheckitem',
                                handler: scatterplotFieldHandler,
                                checked: false,
                                group: 'scatterplot_group'
                            };
                            if (index == 0) {
                                return_obj.checked = true;
                            }
                            return return_obj;
                        })
                    }, {

                        text: 'Plot Range',
                        menu:[{
                            xtype:'compositefield',
                            width: 220,
                            items:[{xtype:'checkbox',
                                handler: function(checbox,checked) { re.display_options.circvis.rings.pairwise_scores.manual_y_values = checked;
                                    Ext.getCmp('min_y_axis').setDisabled(!checked);
                                    Ext.getCmp('max_y_axis').setDisabled(!checked);}
                            },{
                                xtype:'label',
                                text:'Min'
                            },{
                                xtype:'numberfield',
                                width: 50,
                                value:0,
                                id:'min_y_axis',
                                allowBlank:false,
                                allowDecimals: true,
                                decimalPrecision:6,
                                disabled:!re.display_options.circvis.rings.pairwise_scores.manual_y_values,
                                listeners: {
                                    render: function(field) {
                                        re.display_options.circvis.rings.pairwise_scores.min_y_value = field.value;
                                    },
                                   change: function(field, value) {
                                    re.display_options.circvis.rings.pairwise_scores.min_y_value = value;}
                            }
                        },{
                            xtype:'label',
                            text:'Max'
                        },{
                            xtype:'numberfield',
                            text:'Max',
                            width: 50,
                            value:1,
                            id:'max_y_axis',
                            allowBlank:false,
                                allowDecimals: true,
                                decimalPrecision:6,
                            disabled:!re.display_options.circvis.rings.pairwise_scores.manual_y_values,
                            listeners: {
                                render:function(field) {
                                    re.display_options.circvis.rings.pairwise_scores.max_y_value = field.value;
                            },
                            change: function(field, value) {
                                re.display_options.circvis.rings.pairwise_scores.max_y_value = value;}
                        }
                    }]}]
            }, {
                text: 'Color Scale',

                menu:[
                    {
                        xtype:'compositefield',
                        items:[
                            {
                                xtype:'checkbox',
                                handler: function(checbox,checked) { re.display_options.circvis.rings.pairwise_scores.manual_y_color_scale = checked;
                                    Ext.getCmp('min_y_color_menu').setDisabled(!checked);
                                    Ext.getCmp('max_y_color_menu').setDisabled(!checked);}
                            },{
                                xtype:'label',
                                text:'Set Manually'
                            }]
                    },{
                        xtype:'compositefield',
                        id:'min_y_color_menu',
                        width:200,
                        disabled: !re.display_options.circvis.rings.pairwise_scores.manual_y_color_scale,
                        items:[{
                            text:'Min Color',
                            xtype:'label'
                        },{
                            id:'min_y_color',
                            xtype:'colorpickerfield',
                            value:'#0000FF',
                            editMode:'all',
                            width:120,
                            handler :function(field, value) {
                                re.display_options.circvis.rings.pairwise_scores.min_y_color = '#' +value;
                            }
                        }]
                    }, {
                        xtype:'compositefield',
                        id:'max_y_color_menu',
                        width:200,
                        disabled: !re.display_options.circvis.rings.pairwise_scores.manual_y_color_scale,
                        items:[{
                            text:'Max Color',
                            xtype:'label'
                        },{
                            id:'max_y_color',
                            xtype:'colorpickerfield',
                            width:120,
                            value:'#FF0000',
                            hideOnClick:false,
                            editMode:'all',
                            handler:function(field, value) {
                                re.display_options.circvis.rings.pairwise_scores.max_y_color = '#' +value;
                            }

                        }]
                    }]
            }]
        }]
    }, {
        id: 'modalMenu',
        text: 'Mode',
        labelStyle: 'font-weight:bold;',
        menu: [{
            text: 'Circular Plot',
            menu: [{
                xtype: 'menucheckitem',
                handler: modeHandler,
                checked: true,
                id: 'explore_check',
                group: 'mode_group',
                text: 'Explore',
                value: 'explore'
            }, {
                xtype: 'menucheckitem',
                handler: modeHandler,
                group: 'mode_group',
                id: 'nav_check',
                text: 'Navigate',
                value: 'navigate'
            }, {
                xtype: 'menucheckitem',
                handler: modeHandler,
                group: 'mode_group',
                disabled: true,
                id: 'select_check',
                text: 'Select',
                value: 'Select'
            }]
        }]
    }, {
        id: 'helpMenu',
        text: 'Help',
        labelStyle: 'font-weight:bold;',
        menu: [{
            text: 'User Guide',
            handler: userGuideHandler
        }, {
            text: 'Quick Start Guide',
            handler: function() {
                openBrowserTab(re.help.links.quick_start)
            }
        }, {
            text: 'Circular Ideogram',
             handler: function() {
                openBrowserTab(re.help.links.ideogram)
            }
        }, {
            handler: function() {
                openBrowserTab(re.help.links.user_group)
            },
            text: 'User Group'
        }, {
            handler: openIssueHandler,
            text: 'Report an Issue/Bug'
        }]
    }, {
        id: 'aboutMenu',
        text: 'About',
        labelStyle: 'font-weight:bold;',
        menu: [{
            text: 'CSACR',
            handler: function() {
                openBrowserTab('http://www.cancerregulome.org/')
            }
        }, {
            handler: openCodeRepository,
            text: 'Code Repository'
        }, {
            text: 'This Analysis',
            handler: function() {
                openBrowserTab(re.help.links.analysis_summary)
            }
        }, {
            text: 'Contact Us',
            handler: function() {
                openBrowserTab(re.help.links.contact_us)
            }
        }]
    }]
}, {
    region: 'center',
    id: 'center-panel',
    name: 'center-panel',
    layout: 'card',
    border: false,
    closable: false,
    activeItem: 0,
    height: 800,
    margins: '0 5 5 0',
    items: [
        randomforestPanel]
}],
renderTo: Ext.getBody()
});


function ringHandler(item) {
    re.setRingHidden(item.getId(), item.checked); //hidden if true!
    requestFeatureFilteredRedraw();
}

function userGuideHandler(item) {
    openBrowserTab(re.help.links.user_guide);
}

function openIssueHandler(item) {
    openBrowserTab(re.help.links.bug_report);
}

function openCodeRepository(item) {
    openBrowserTab('http://code.google.com/p/regulome-explorer/');
}

function modeHandler(item) {
    switch (item.getId()) {
        case ('nav_check'):
            vq.events.Dispatcher.dispatch(new vq.events.Event('modify_circvis', 'main_menu', {
                pan_enable: true,
                zoom_enable: true
            }));
            break;
        case ('explore_check'):
        default:
            vq.events.Dispatcher.dispatch(new vq.events.Event('modify_circvis', 'main_menu', {
                pan_enable: false,
                zoom_enable: false
            }));
    }
}

function scatterplotFieldHandler(item) {
    re.display_options.circvis.rings.pairwise_scores.value_field = re.model.association.types[re.model.association_map[item.value]].id;
}

function networkLayoutHandler(item) {
    switch (item.text) {
        case ('Radial'):
            re.display_options.cytoscape.layout = 'radial';
            break;
        case ('Tree'):
            re.display_options.cytoscape.layout = 'tree';
            break;
        case ('Force Directed'):
        default:
            re.display_options.cytoscape.layout = 'force_directed';
            break;
    }
    vq.events.Dispatcher.dispatch(new vq.events.Event('layout_network', 'main_menu', {}));
}

re.windows.export_window = new Ext.Window({
    id: 'export-window',
    renderTo: 'view-region',
    modal: true,
    closeAction: 'hide',
    layout: 'anchor',
    width: 600,
    height: 500,
    title: "Export Image",
    closable: true,
    tools: [{
        id: 'help',
        handler: function(event, toolEl, panel) {
            openHelpWindow('Export', re.help.strings.exportHelpString);
        }
    }],
    layoutConfig: {
        animate: true
    },
    maximizable: false,
    items: {
        xtype: 'textarea',
        id: 'export-textarea',
        name: 'export-textarea',
        padding: '5 0 0 0',
        autoScroll: true,
        anchor: '100% 100%'
    }
});
re.windows.export_window.hide();

var loadListener = function(store, records) {
    store.removeListener('load', loadListener);
    var e = new vq.events.Event('data_request', 'annotations', {});
    e.dispatch();

    pathedMenu.addPathedItems(records);
    datasetTree.addNodes(records);
};

var datasetTree = new org.cancerregulome.explorer.view.DatasetTree({text:'Datasets',expanded:true,autoScroll:true});
var datasetGrid = new Ext.grid.GridPanel({
        title:'Grid',
        id: 'dataset-grid',
        autoScroll: true,
        loadMask: true,
        monitorResize: true,
        autoWidth: true,
        height: 250,
        viewConfig: {
            forceFit: true
        },
        cm: new Ext.grid.ColumnModel({
            columns: [{
                header: "Description",
                width: 120,
                id: 'description',
                dataIndex: 'description'
            }, {
                header: "Date",
                width: 90,
                id: 'dataset_date',
                dataIndex: 'dataset_date',
                hidden: false
            }, {
                header: "Label",
                width: 120,
                id: 'label',
                dataIndex: 'label',
                hidden: true
            }, {
                header: "Method",
                width: 70,
                id: 'method',
                dataIndex: 'method'
            }, {
                header: "Source",
                width: 70,
                id: 'source',
                dataIndex: 'source'
            }, {
                header: "Disease",
                width: 70,
                id: 'disease',
                dataIndex: 'disease'
            }, {
                header: "Contact",
                width: 200,
                id: 'contact',
                dataIndex: 'contact'
            }, {
                header: "Comments",
                width: 100,
                id: 'comments',
                dataIndex: 'comments'
            }],
            defaults: {
                sortable: true,
                width: 100
            }

        }),
        store: new Ext.data.JsonStore({
            autoLoad: true,
            storeId: 'dataset_grid_store',
            idProperty: 'label',
            proxy: new Ext.data.HttpProxy({
            url: re.databases.base_uri + re.databases.rf_ace.uri + re.tables.dataset + re.rest.query + '?' + re.params.query + 'select `description`, `dataset_date`,`label`, `method`, `source`, `disease`, `contact`, `comments`' + re.analysis.dataset_method_clause + ' order by default_display DESC' + re.params.json_out
            }),
            fields: ['description', 'label', 'dataset_date', 'method', 'source', 'disease', 'contact', 'comments'],
            listeners: {
                load: loadListener
            }
        })
    });

    re.windows.dataset_window = new Ext.Window({
        id: 'dataset-window',
        renderTo: Ext.getBody(),
        modal: true,
        closeAction: 'hide',
        layout:'fit',
        width: 800,
        height: 300,
        title: "Load Dataset",
        closable: true,
        layoutConfig: {
            animate: true
        },
        maximizable: false,
        items: {
            xtype: 'tabpanel',
            id:'dataset-tabpanel',
            activeTab: 'dataset-tree',
            deferredRender : false,
            items: [
                {
                    xtype:'treepanel',
                    title:'Tree',
                    id:'dataset-tree',
                    rootVisible:false,
                    autoScroll:true,
                    root: datasetTree
                },
                datasetGrid
            ]
        },
        bbar: [{
            text: 'Load',
            handler: manualLoadSelectedDataset
        }, {
            text: 'Cancel',
            handler: hideDatasetWindow
        }]
    });
    re.windows.dataset_window.hide();

var medlineStore = new Ext.data.JsonStore({
    root: 'response.docs',
    totalProperty: 'response.numFound',
    idProperty: 'pmid',
    remoteSort: true,
    storeId: 'dataDocument_grid_store',
    fields: ['pmid', 'article_title', 'abstract_text', 'pub_date_month', 'pub_date_year'],
    proxy: new Ext.data.HttpProxy({
        url: re.databases.medline.uri + re.databases.medline.select + '?'
    }),
    listeners: {
        'load' : function(store, records) {
            if (records.length < 1) { Ext.getCmp('details-tabpanel').items.get(1).setDisabled(true);}
            else { Ext.getCmp('details-tabpanel').items.get(1).setDisabled(false);}
        }
    }
});

re.windows.details_window = new Ext.Window({
    id: 'details-window',
    renderTo: 'view-region',
    modal: false,
    closeAction: 'hide',
    layout: 'fit',
    width: 800,
    height: 600,
    constrain: true,
    title: "Details",
    closable: true,
    layoutConfig: {
        animate: true
    },
    maximizable: false,
    items: [{
        xtype: 'tabpanel',
        id: 'details-tabpanel',
        name: 'details-tabpanel',
        activeTab: 'scatterplot_parent',
        layoutOnCardChange: true,
        items: [{
            xtype: 'panel',
            id: 'scatterplot_parent',
            name: 'scatterplot_parent',
            title: 'Data Plot',
            layout: 'border',
            margins: '3 0 3 3',
            height: 550,
            width: 680,
            frame: true,
            items: [{
                xtype: 'panel',
                id: 'scatterplot_panel',
                name: 'scatterplot_panel',
                region: 'center'
            }, {

                xtype: 'panel',
                id: 'scatterplot-legend-panel',
                name: 'scatterplot-legend-panel',
                region: 'east',
                width:120
            },{
                xtype: 'panel',
                id: 'scatterplot_controls',
                name: 'scatterplot_controls',
                region:'south',
                height:130,
                split:false,
                layout: 'form',
                items: [{
                    xtype: 'radiogroup',
                    id: 'scatterplot_regression_radiogroup',
                    fieldLabel: 'Regression',
                    items: [{
                        checked: true,
                        boxLabel: 'None',
                        inputValue: 'none',
                        name: 'sp_rb'
                    }, {
                        boxLabel: 'Linear',
                        inputValue: 'linear',
                        name: 'sp_rb'
                    },
                    {
                        boxLabel: 'Median-median',
                        inputValue: 'median',
                        name: 'sp_rb'
                    },
                     {
                        boxLabel: 'Loess tri-cube',
                        inputValue: 'loess',
                        name: 'sp_rb'
                    }],
                    listeners: {
                        change: function(checked_radio) {
                            renderScatterPlot();
                        }
                    }
                }, {
                    xtype: 'compositefield',
                    defaultMargins: '0 20 0 0',
                    items: [{
                        xtype: 'checkbox',
                        id: 'scatterplot_axes_checkbox',
                        boxLabel: 'Reverse Axes',
                        listeners: {
                            check: function(checked) {
                                renderScatterPlot();
                            }
                        }
                    }, {
                        xtype: 'checkbox',
                        id: 'scatterplot_discrete_x_checkbox',
                        boxLabel: 'Discretize '+re.ui.feature1.label,
                        listeners: {
                            check: function(checked) {
                                renderScatterPlot();
                            }
                        }
                    }, {
                        xtype: 'checkbox',
                        id: 'scatterplot_discrete_y_checkbox',
                        boxLabel: 'Discretize ' +re.ui.feature2.label,
                        listeners: {
                            check: function(checked) {
                                renderScatterPlot();
                            }
                        }
                    }]
                }, {
                    xtype: 'compositefield',
                    defaultMargins: '0 20 0 0',
                    items: [
                        new Ext.form.ComboBox({
                            id: 'scatterplot_colorby_combobox',
                            disabled: true,
                            emptyText: 'Select feature...',
                            fieldLabel: 'Color By',
                            displayField: 'label',
                            valueField: 'alias',
                            mode: 'local',
                            width:250,
                            triggerAction : 'all',
                            store: new Ext.data.JsonStore({
                                id: 'categorical_feature_store',
                                fields: ['alias', 'label', 'interesting_score'],
                                data: [],
                                sortInfo: {
                                    field: 'interesting_score',
                                    direction: 'DESC'
                                }
                            }),
                            listeners: {
                                select: {
                                    fn: function(combo, value) {
                                        var alias = value.data.alias;
                                        vq.events.Dispatcher.dispatch(new vq.events.Event('data_request', 'patient_categories', alias));
                                    }
                                }
                            }
                        }),
                        {
                            xtype: 'checkbox',
                            id: 'scatterplot_colorby_checkbox',
                            boxLabel: 'Enable',
                            listeners: {
                                check: {
                                    fn: function(checkbox) {
                                        if (checkbox.checked == true) {
                                            var combo = Ext.getCmp('scatterplot_colorby_combobox');
                                            var alias = combo.getValue();
                                            combo.enable();
                                            if (alias.length > 0) {
                                                vq.events.Dispatcher.dispatch(new vq.events.Event('data_request', 'patient_categories', alias));
                                            }
                                        }
                                        else {
                                            Ext.getCmp('scatterplot_colorby_combobox').disable();
                                            re.plot.scatterplot_category = undefined;
                                            renderScatterPlot();
                                        }
                                    }
                                }
                            }
                        }
                    ]
                }],
                buttons:[{
                            id:'csv_scatterplot_export',
                            text:'CSV',
                            listeners: {
                                click: function(button, e) {
                                    exportScatterplotData('csv');
                                }
                            }
                        },{
                            id:'tsv_scatterplot_export',
                            text:'TSV',
                            listeners: {
                                click: function(button, e) {
                                    exportScatterplotData('tsv');
                                }
                            }
                    }]
            }]
        }, {
            xtype: 'panel',
            id: 'medline_parent',
            name: 'medline_parent',
            title: 'MEDLINE',
            layout: 'anchor',
            margins: '3 0 3 3',
            height: 500,
            width: 600,
            frame: true,
            items: [{
                id: 'dataDocument-panel',
                name: 'dataDocument-panel',
                layout: 'anchor',
                anchor: '100% 100%',
                collapsible: false,
                items: [{
                    xtype: 'grid',
                    id: 'dataDocument_grid',
                    name: 'dataDocument_grid',
                    autoScroll: true,
                    autoWidth: true,
                    loadMask: true,
                    anchor: '100% 100%',
                    store: medlineStore,
                    viewConfig: {
                        forceFit: true,
                        enableRowBody: true,
                        showPreview: true,
                        getRowClass: function(record, rowIndex, p, store) {
                            var jsonData = store.reader.jsonData;
                            if (jsonData.highlighting[record.id] != undefined && jsonData.highlighting[record.id].abstract_text != undefined) {
                                p.body = '<p>' + jsonData.highlighting[record.id].abstract_text[0] + '</p>';
                            } else p.body = '<p>' + record.data.abstract_text + '</p>';
                            return 'x-grid3-row-expanded';
                        }
                    },
                    cm: new Ext.grid.ColumnModel({
                        columns: [{
                            header: "PMID",
                            width: 50,
                            id: 'pmid',
                            dataIndex: 'pmid',
                            groupName: 'Documents',
                            renderer: renderPMID
                        }, {
                            header: "Title",
                            width: 300,
                            id: 'article_title',
                            dataIndex: 'article_title',
                            groupName: 'Documents',
                            renderer: renderTitle
                        }, {
                            header: "Month",
                            width: 75,
                            id: 'pub_date_month',
                            dataIndex: 'pub_date_month',
                            groupName: 'Documents'
                        }, {
                            header: "Year",
                            width: 75,
                            id: 'pub_date_year',
                            dataIndex: 'pub_date_year',
                            groupName: 'Documents'
                        }],
                        defaults: {
                            sortable: true
                        }
                    }),
                    bbar: new Ext.PagingToolbar({
                        pageSize: 20,
                        store: medlineStore,
                        displayInfo: true,
                        displayMsg: 'Displaying documents {0} - {1} of {2}',
                        emptyMsg: "No documents",
                        items: ['-',
                            {
                                pressed: true,
                                enableToggle: true,
                                text: 'Show Preview',
                                cls: 'x-btn-text-icon details',
                                toggleHandler: function(btn, pressed) {
                                    var view = Ext.getCmp('dataDocument_grid').getView();
                                    view.showPreview = pressed;
                                    view.refresh();
                                }
                            }]
                    })
                }]
            }]
        }] // medline tab
    }] //tabpanel
});
re.windows.details_window.hide();

});

var pathedMenu = new org.cancerregulome.explorer.view.DatasetMenu({});
