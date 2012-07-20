if (re.model === undefined) re.model = {};

re.model.association =  {
	types : [
		 {       id : 'pvalue',
                        label : 'PValue',
                        ui : {
                        filter : {
                                                                        component: {
                                                                                                xtype : 'numberfield',
                                                id:'pvalue',
                                                name :'pvalue',
                                                allowNegative: true,
                                                decimalPrecision : 3,
                                                emptyText : 'Input value...',
                                                invalidText:'This value is not valid.',
                                                maxValue:100,
                                                minValue:0,
                                                tabIndex : 1,
                                                validateOnBlur : true,
                                                fieldLabel : 'PValue -log(10) >=',
                                                defaultValue : 3,
                                                value : 3
                                            }
                        },
                        grid : {
                                column : { header : "pvalue", width : 50 , id: 'pvalue' , dataIndex : 'pvalue'},
                                store_index : 'pvalue'
                        }
                        },
                        query : {
                                id : 'pvalue',
                                clause : 'pvalue >= ',
                                order_direction : 'ASC'
                        },
                        vis : {
                                network : {
                                        edgeSchema : {name: "pvalue", type: "number" }
                                },
                                tooltip : {
                                        entry : { pvalue : 'pvalue' }
                                },
                scatterplot : {
                    values : {
                                               min : 0,
                                                max : 0.5
                                            },
                    color_scale : pv.Scale.linear(0.5,0).range('blue','red')
                }
                        }
                },
{ 	id : 'importance',
			label : 'Importance',
			ui : {
			filter : { 
				 					component: {
					 							xtype : 'numberfield',
                                                id:'importance',
                                                name :'importance',
                                                allowNegative: false,
                                                decimalPrecision : 10,
                                                emptyText : 'Input value...',
                                                invalidText:'This value is not valid.',
                                                minValue:0,
						hidden: true,
                                                tabIndex : 1,
                                                validateOnBlur : true,
                                                fieldLabel : 'Importance >=',
                                                defaultValue : 0.001,
                                                value : 0.0001
                                            }
			},
			grid : {
				column : { header: "Importance", width:50, hidden: true, id:'importance',dataIndex:'importance' },
				store_index : 'importance'
				}
			},
			query : {
				id : 'importance',
				clause : 'importance >= ',
				order_direction : 'DESC'
			},
			vis : {
				network : {
					edgeSchema : { name: "importance", type: "number" }
				},
				tooltip : {
					entry : { 'Importance' : 'importance'}
				},
                scatterplot : {
                    scale_type :'linear',
                    values : {
                        min : 0,
                        max:0.1
                    },
                    color_scale : pv.Scale.linear(0,0.1).range('blue','red')
                }
			}	
		},
                /*{id : 'link_distance',
                        label : 'Link_Distance',
                        query : {
                                id : 'link_distance'
                        }
		},*/
		{ 	id : 'correlation',
			label : 'Correlation',
			ui : {
			filter : { 
				 					component:   new re.multirangeField(
                                                {   id:'correlation',
                                                    label: 'Correlation',
                                                    default_value: 0.1,
                                                    min_value: -1,
                                                    max_value: 1}
                                            )
			},
			grid : {
				column : { header: "Correlation", width:50, id:'correlation',dataIndex:'correlation'},
				store_index : 'correlation'
			}
			},
			query : {
				id : 'correlation',
				clause : flex_field_query,
				order_direction : 'DESC'
			},
			vis : {
				network : {
					edgeSchema : { name: "correlation", type: "number" }
				},
				tooltip : {
					entry : {  Correlation : 'correlation'}
				},
                scatterplot : {
                    scale_type :'linear',
                    values : {
                           min : -1,
                            max : 1
                        },
                    color_scale : pv.Scale.linear(-1,0,1).range('red','blue','red')
                }
			}
		}
	]
};

re.model.association_map = pv.numerate(re.model.association.types, function(obj) { return obj.id;});
