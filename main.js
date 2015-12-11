require({
    packages: [
        {
            name: "jquery",
            location: "http://ajax.googleapis.com/ajax/libs/jquery/1.11.1/",
            main: "jquery.min"
        }    
    ]
});
define([
        "dojo/_base/declare", "framework/PluginBase", 'plugins/water_quality/ConstrainedMoveable', 'plugins/water_quality/jquery-ui-1.11.0/jquery-ui',
		"plugins/water_quality/chartist/chartist",
		
		"esri/layers/ArcGISDynamicMapServiceLayer", "esri/layers/FeatureLayer", "esri/tasks/QueryTask", "esri/tasks/query", "esri/graphicsUtils", 
		"esri/geometry/Extent", "esri/SpatialReference", "esri/geometry/Point", 
		
		"esri/symbols/SimpleLineSymbol", "esri/symbols/SimpleFillSymbol", "esri/symbols/SimpleMarkerSymbol", "esri/graphic", "esri/symbols/Font", 
		"esri/symbols/TextSymbol", "esri/symbols/PictureMarkerSymbol", "dojo/_base/Color", "esri/renderers/SimpleRenderer",	"esri/lang",	
		
		"dijit/registry", "dijit/form/Button", "dijit/form/DropDownButton", "dijit/DropDownMenu", "dijit/MenuItem", "dijit/layout/ContentPane",
		"dijit/form/HorizontalSlider", "dijit/form/CheckBox", "dijit/form/RadioButton", "dijit/TooltipDialog", "dijit/popup",
		
		"dojo/dom", "dojo/dom-class", "dojo/dom-style", "dojo/_base/window", "dojo/dom-construct", "dojo/dom-attr", "dijit/Dialog", "dojo/dom-geometry",
		"dojo/_base/array", "dojo/_base/lang", "dojo/on", "dojo/parser", "dojo/query", "dojo/NodeList-traverse", "dojo/dnd/Moveable", "dojo/dnd/move",
		
		"dojo/text!./layerviz.json", "jquery"
       ],
       function ( declare, PluginBase, ConstrainedMoveable, ui, Chartist,
					ArcGISDynamicMapServiceLayer, FeatureLayer, QueryTask, esriQuery, graphicsUtils, Extent, SpatialReference, Point, 
					SimpleLineSymbol, SimpleFillSymbol, SimpleMarkerSymbol, Graphic, Font, TextSymbol, PictureMarkerSymbol, Color, SimpleRenderer, esriLang,
					registry, Button, DropDownButton, DropDownMenu, MenuItem, ContentPane, HorizontalSlider, CheckBox, RadioButton, TooltipDialog, dijitPopup,
					dom, domClass, domStyle, win, domConstruct, domAttr, Dialog, domGeom, array, lang, on, parser, dojoquery, NodeListtraverse, Moveable, move,
					layerViz, $ ) {
					
			return declare(PluginBase, {
				toolbarName: "Water Quality",
				toolbarType: "sidebar",
				showServiceLayersInLegend: false,
				allowIdentifyWhenActive: false,
				rendered: false,
				width: "290",
				height: "580",
				//infoGraphic: "plugins/water_quality/images/infoGraphic.jpg",
				
				initialize: function (frameworkParameters) {
					declare.safeMixin(this, frameworkParameters);
					domClass.add(this.container, "claro");
					con = dom.byId('plugins/water_quality-0');
						domStyle.set(con, "width", "245px");
						domStyle.set(con, "height", "580px");
					con1 = dom.byId('plugins/water_quality-1');
					if (con1 != undefined){
						domStyle.set(con1, "width", "245px");
						domStyle.set(con1, "height", "580px");
					}
					this.config = dojo.eval("[" + layerViz + "]")[0];	
					this.controls = this.config.controls;
					this.config.traits = [];
				},
			   
				activate: function () {
					if (this.rendered == false) {
						this.rendered = true;
						this.render();
						this.currentLayer.setVisibility(true);
					} else {
						if (this.currentLayer != undefined)  {
							this.currentLayer.setVisibility(true);	
						}
						
						this.resize();
					}
			    },
				
				deactivate: function () {

				},	
				hibernate: function () { 	
					if (this.sliderpane != undefined){
						this.sliderpane.destroy();
					}
					if (this.currentLayer != undefined)  {
						this.currentLayer.setVisibility(false);
						this.map.graphics.clear();
					}
					if (this.legendWin != undefined){
						this.legendWin.destroy();
					}
					if (this.chartWin != undefined){
						this.chartWin.destroy();	
					}	
					if (this.buttonpane !=undefined ){
						this.buttonpane.destroy();
					}
					if (this.map != undefined){
						this.map.graphics.clear();
					}
					if (this.huc12 != undefined){
						this.map.removeLayer(this.huc12)
					}
					if (this.soils != undefined){
						this.map.removeLayer(this.soils)
					}
					if (this.samplePoints != undefined){
						this.map.removeLayer(this.samplePoints)
					}
					if (this.samplingStations != undefined){
						this.map.removeLayer(this.samplingStations)
					}
					
					$('.legend').removeClass("hideLegend")
					this.rendered = false;
				},
				
				resize: function(w, h) {
					cdg = domGeom.position(this.container);
					if (cdg.h == 0) {
						this.sph = this.height - 120 	
					} else {
						this.sph = cdg.h-82;
					}
					domStyle.set(this.sliderpane.domNode, "height", this.sph + "px"); 
				},
				
				changeOpacity: function(e) {
					this.currentLayer.setOpacity(1 - e)
				},
				
				render: function() {	
					this.map.on("load", function(){
						this.map.graphics.enableMouseEvents();
						
					});
					$('.legend').addClass("hideLegend")
					// HUC12 Symbol					
					this.hucSym = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, 
						new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, 
						new Color([200,132,29,0.35]), 1),
						new Color([125,125,125,0]));
					this.soilsSym = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, 
						new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, 
						new Color([100,100,0,1]), 2),
						new Color([100,100,0,0.3]));
					this.pntSym = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 11,
						new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
						new Color([0,0,0]), 1.5),
						new Color([161,70,18,1]));
					this.stationSym = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 11,
						new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
						new Color([0,0,0]), 1.5),
						new Color([58,138,206,1]));
					this.hlStationPoint = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 11,
						new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
						new Color([0,0,255]), 1.5),
						new Color([206,200,58,1]));				
					this.sliderpane = new ContentPane({});
					parser.parse();
					dom.byId(this.container).appendChild(this.sliderpane.domNode);					
													
					this.buttonpane = new ContentPane({
					  style:"border-top-style:groove !important; height:80px;overflow: hidden !important;background-color:#F3F3F3 !important;padding-top:5px !important;"
					});
					dom.byId(this.container).appendChild(this.buttonpane.domNode);	
					
					//transparency slider	
					nslidernode = domConstruct.create("div", {});
					this.buttonpane.domNode.appendChild(nslidernode); 
					labelsnode = domConstruct.create("ol", {
						"data-dojo-type":"dijit/form/HorizontalRuleLabels", 
						container:"bottomDecoration", 
						style:"height:0.25em;padding-top: 7px !important;color:black !important", 
						innerHTML: "<li>Opaque</li><li>Transparent</li>"
					})
					nslidernode.appendChild(labelsnode);
					slider = new HorizontalSlider({
						value: 0,
						minimum: 0,
						maximum: 1,
						showButtons:false,
						title: "Change the layer transparency",
						//intermediateChanges: true,
						//discreteValues: entry.options.length,
						onChange: lang.hitch(this,this.changeOpacity),
						style: "width:150px; position:absolute; left:30px; bottom:20px; background-color:#F3F3F3 !important"
					}, nslidernode);
					parser.parse()
					
					// Sample Points Charts Popup
					mymap = dom.byId(this.map.id);
					a1 = dojoquery(mymap).parent();
					this.c = makeid();
					this.chartWin = new ContentPane({
					  id: this.c,
					  style:"display:none; z-index:8; position:absolute; right:105px; top:60px; width:620px; height:410px; background-color:#FFF; border-style:solid; border-width:4px; border-color:#444; border-radius:5px;box-shadow: 3px 3px 5px 0px rgba(102,102,102,0.7);",
					  innerHTML: 
						"<div class='chartCloser' style='float:right !important;'><a href='#' style='color:#cecfce;'>✖</a></div>" +
						"<div id='" + this.sliderpane.id + "chartHeader' style='background-color:#424542; color:#fff; height:28px; font-size:1em; font-weight:bold; padding:8px 0px 0px 10px; cursor:move;'>Station ID</div>" +	
						"<div id='" + this.sliderpane.id + "chartContent' class='chartDiv'>" +
							"<div class='summaryDiv'>" +
								"<div id='" + this.sliderpane.id + "traitBar' class='buttonBar bottomRight'>" +
								   "<label class='buttonBar__item'>" +
									 "<input type='radio'>" +
									 "<button id='" + this.sliderpane.id + "-DOmean' class='buttonBar__button'>Disolved Oxygen</button>" +
								   "</label>" +
								   "<label class='buttonBar__item'>" +
									 "<input type='radio'>" +
									 "<button id='" + this.sliderpane.id + "-Nmean' class='buttonBar__button'>Nitrogen</button>" +
								   "</label>" +
								   "<label class='buttonBar__item'>" +
									 "<input type='radio'>" +
									 "<button id='" + this.sliderpane.id + "-Pmean' class='buttonBar__button'>Phosphorus</button>" +
								   "</label>" +
								   "<label class='buttonBar__item'>" +
									 "<input type='radio'>" +
									 "<button id='" + this.sliderpane.id + "-TDSmean' class='buttonBar__button'>Total Dissolved Solids</button>" +
								   "</label>" +
								   "<label class='buttonBar__item'>" +
									 "<input type='radio'>" +
									 "<button id='" + this.sliderpane.id + "-TSSmean' class='buttonBar__button'>Total Suspended Solids</button>" +
								   "</label>" +
								   "<label class='buttonBar__item'>" +
									 "<input type='radio'>" +
									 "<button id='" + this.sliderpane.id + "-TURmean' class='buttonBar__button'>Turbidity</button>" +
								   "</label>" +
								"</div>" +
								"<div id='" + this.sliderpane.id + "barChartTitle' class='chartTitles' style='margin-top:10px; margin-bottom:10px;'>Average Readings by Year (Click bars or years for monthly readings by year)</div>" +
								"<div class='hp'>" +
									"<div id='" + this.sliderpane.id + "hLbl' class='hLbl'></div>" +
									"<div id='" + this.sliderpane.id + "mLbl' class='mLbl'></div>" +
									"<div id='" + this.sliderpane.id + "lLbl' class='lLbl'></div>" +
									"<div id='" + this.sliderpane.id + "uLbl' class='uLbl'></div>" +
								"</div>" +
								"<div class='hpLines'>" +
									"<div class='lClass hLine'></div>" +
									"<div class='lClass mLine'></div>" +
									"<div class='lClass lLine'></div>" +
									"<div class='lClass uLine'></div>" +		
								"</div>" +	
								"<div id='" + this.sliderpane.id + "meanBarDiv' class='barHolder'>" +
									"<div class='meanBars' style='left:3px;'   id='" + this.sliderpane.id + "mean1995'></div>" +
									"<div class='meanBars' style='left:29px;'  id='" + this.sliderpane.id + "mean1996'></div>" +
									"<div class='meanBars' style='left:55px;'  id='" + this.sliderpane.id + "mean1997'></div>" +
									"<div class='meanBars' style='left:81px;'  id='" + this.sliderpane.id + "mean1998'></div>" +
									"<div class='meanBars' style='left:107px;' id='" + this.sliderpane.id + "mean1999'></div>" +
									"<div class='meanBars' style='left:133px;' id='" + this.sliderpane.id + "mean2000'></div>" +
									"<div class='meanBars' style='left:159px;' id='" + this.sliderpane.id + "mean2001'></div>" +
									"<div class='meanBars' style='left:185px;' id='" + this.sliderpane.id + "mean2002'></div>" +
									"<div class='meanBars' style='left:211px;' id='" + this.sliderpane.id + "mean2003'></div>" +
									"<div class='meanBars' style='left:237px;' id='" + this.sliderpane.id + "mean2004'></div>" +
									"<div class='meanBars' style='left:263px;' id='" + this.sliderpane.id + "mean2005'></div>" +
									"<div class='meanBars' style='left:289px;' id='" + this.sliderpane.id + "mean2006'></div>" +
									"<div class='meanBars' style='left:315px;' id='" + this.sliderpane.id + "mean2007'></div>" +
									"<div class='meanBars' style='left:341px;' id='" + this.sliderpane.id + "mean2008'></div>" +
									"<div class='meanBars' style='left:367px;' id='" + this.sliderpane.id + "mean2009'></div>" +
									"<div class='meanBars' style='left:393px;' id='" + this.sliderpane.id + "mean2010'></div>" +
									"<div class='meanBars' style='left:419px;' id='" + this.sliderpane.id + "mean2011'></div>" +
									"<div class='meanBars' style='left:445px;' id='" + this.sliderpane.id + "mean2012'></div>" +
									"<div class='meanBars' style='left:470px;' id='" + this.sliderpane.id + "mean2013'></div>" +
									"<div class='meanBars' style='left:496px;' id='" + this.sliderpane.id + "mean2014'></div>" +
								"</div>" +
								"<div id='" + this.sliderpane.id + "smLabelDiv' style='width:520px; height:35px' class='bottomRight'>" +
									"<div class='smallLabels'><div class='slText'>1995</div></div>" +
									"<div class='smallLabels'><div class='slText'>1996</div></div>" +
									"<div class='smallLabels'><div class='slText'>1997</div></div>" +
									"<div class='smallLabels'><div class='slText'>1998</div></div>" +
									"<div class='smallLabels'><div class='slText'>1999</div></div>" +
									"<div class='smallLabels'><div class='slText'>2000</div></div>" +
									"<div class='smallLabels'><div class='slText'>2001</div></div>" +
									"<div class='smallLabels'><div class='slText'>2002</div></div>" +
									"<div class='smallLabels'><div class='slText'>2003</div></div>" +
									"<div class='smallLabels'><div class='slText'>2004</div></div>" +
									"<div class='smallLabels'><div class='slText'>2005</div></div>" +
									"<div class='smallLabels'><div class='slText'>2006</div></div>" +
									"<div class='smallLabels'><div class='slText'>2007</div></div>" +
									"<div class='smallLabels'><div class='slText'>2008</div></div>" +
									"<div class='smallLabels'><div class='slText'>2009</div></div>" +
									"<div class='smallLabels'><div class='slText'>2010</div></div>" +
									"<div class='smallLabels'><div class='slText'>2011</div></div>" +
									"<div class='smallLabels'><div class='slText'>2012</div></div>" +
									"<div class='smallLabels'><div class='slText'>2013</div></div>" +
									"<div class='smallLabels'><div class='slText'>2014</div></div>" +
								"</div>" +
								"<div id='" + this.sliderpane.id + "lineChartTitle' class='chartTitles' style='margin-top:15px; margin-bottom:-10px;'></div>" +
								"<div id='" + this.sliderpane.id + "lineChart' class='ct-chart' style='margin-left:-50px;'></div>" +
							"</div>" +						
						"</div>" 		
					});
					dom.byId(a1[0]).appendChild(this.chartWin.domNode)
					ta = dojoquery(this.chartWin.domNode).children(".chartCloser");
					this.chartWincloser = ta[0];
					on(this.chartWincloser, "click", lang.hitch(this,function(e){
						//domStyle.set(this.chartWin.domNode, 'display', 'none');
						$('#' + this.c).slideUp('fast');
						this.map.graphics.clear();
					}));					
					var q = new ConstrainedMoveable(
						dom.byId(this.chartWin.id), {
						handle: dom.byId(this.sliderpane.id + "chartHeader"),	
						within: true
					});
					
					
					// custom legend
					mymap = dom.byId(this.map.id);
					a = dojoquery(mymap).parent();
					this.b = makeid();
					this.dynamicLegendHeight = 0;
					this.legendWin = new ContentPane({
					  id: this.b,
					  style:"display:none; z-index:8; position:absolute; right:105px; width:50px; height:300px; bottom:50px; background-color:#FFF; border-style:solid; border-width:4px; border-color:#444; border-radius:5px;box-shadow: 3px 3px 5px 0px rgba(102,102,102,0.7);",
					  innerHTML: "<div class='tabareacloser' style='float:right !important;'><a href='#' style='color:#cecfce'>✖</a></div><div id='" + this.sliderpane.id + "tabHeader' style='background-color:#424542; color:#fff; height:28px; font-size:1em; font-weight:bold; padding:8px 0px 0px 10px; cursor:move;'>Water Quality Legend</div>" +	
						"<div id='" + this.sliderpane.id + "idContent' class='idDiv'>" +
							"<div id='" + this.sliderpane.id + "_landCoverLegend' style='float:right; display:none; text-align:right; margin-left:-10px; padding:3px; width:330px; height:185px'>" +
								"<div id='" + this.sliderpane.id + "_landCoverLegendb' style='float:right; display:block; text-align:right; margin-left:0px; margin-top:14px; padding:3px; width:180px; height:200px'></div>" +
								"<div id='" + this.sliderpane.id + "_landCoverLegenda' style='float:right; display:block; text-align:right; margin-left:0px; padding:3px; padding-left:0; width:140px; height:225px'></div>" +
							"</div>" +
							"<div id='" + this.sliderpane.id + "_jsonLegend1' style='float:right; display:none; text-align:right; margin-left:10px; padding:3px; width:150px; height:130px'>" +
								"<span style='text-decoration:underline;font-weight:bold;margin-top:5px;'>Clickable Layers</span><br>" +
								"<span style='text-decoration:none;font-weight:normal;margin-top:5px;'>(For best results, turn on one<br>at a time)</span><br>" +
								"<div id='" + this.sliderpane.id + "hucLegend' style='display:none; margin-bottom:0px;margin-top:5px;'><p style='display:inline;'>HUC 12</p><div style='float:right; height:17px; width:17px; margin-left:5px; margin-top:3px; margin-right:1px; border: 1px solid #c8841d'></div></div>" +
								"<div id='" + this.sliderpane.id + "soilsLegend' style='display:none; margin-bottom:0px;'><p style='display:inline;'>Soils Data</p><div style='float:right; height:17px; width:17px; margin-left:5px; margin-right:1px; margin-top:3px; border: 1px solid #732400'></div></div>" + 
								"<div id='" + this.sliderpane.id + "spntLegend' style='display:none; margin-bottom:0px;'><p style='display:inline;'>Sample Points</p><div style='float:right; height:12px; width:12px; margin-left:5px; margin-right:4px; margin-top:4px; border-radius:50%; border: 1px solid #000; background-color:#a14612;'></div></div>" + 
								"<div id='" + this.sliderpane.id + "stationLegend' style='display:none; margin-bottom:0px;'><p style='display:inline;'>Water Quality Stations</p><div style='float:right; height:12px; width:12px; margin-left:5px; margin-right:4px; margin-top:4px; border-radius:50%; border: 1px solid #000; background-color:#3a8ace;'></div></div>" + 
							"</div>" +
							"<div id='" + this.sliderpane.id + "_jsonLegend' style='float:right; display:none; text-align:right; margin:0px; padding:3px; width:120px;'></div>" +
						"</div>" 		
					});
					dom.byId(a[0]).appendChild(this.legendWin.domNode)
					ta = dojoquery(this.legendWin.domNode).children(".tabareacloser");
					this.legendWincloser = ta[0];
					on(this.legendWincloser, "click", lang.hitch(this,function(e){
						domStyle.set(this.legendWin.domNode, 'display', 'none');
						this.map.graphics.clear();
					}));					
					var p = new ConstrainedMoveable(
						dom.byId(this.legendWin.id), {
						handle: dom.byId(this.sliderpane.id + "tabHeader"),	
						within: true
					});
					
					//Build land cover legend from JSON
					var lngid2a = this.sliderpane.id + "_landCoverLegenda"
					var lngid2b = this.sliderpane.id + "_landCoverLegendb"
					$.getJSON( "http://50.18.215.52/arcgis/rest/services/Louisiana_Freshwater/NRCS_Water_Quality/MapServer/legend?f=pjson", function( json ) {
						var landArray = [];
						//get legend pics
						array.forEach(json.layers, lang.hitch(this,function(v, i){
							if (v.layerName == "Boeu Land Cover"){
								landArray.push(v)	
							}	
						}))
						// land cover legend
						$('#' + lngid2a).append("<span style='text-decoration:underline;font-weight:bold;margin-top:5px;'>Land Cover</span><br>")
						array.forEach(landArray[0].legend, lang.hitch(this,function(v, i){
							if (i < 8){
								$('#' + lngid2a).append("<p style='display:inline;'>" + v.label + "</p><img style='margin-bottom:-5px; margin-left:5px;' src='data:image/png;base64," + v.imageData + "' alt='Legend color'><br>")		
							}else{
								$('#' + lngid2b).append("<p style='display:inline;'>" + v.label + "</p><img style='margin-bottom:-5px; margin-left:5px;' src='data:image/png;base64," + v.imageData + "' alt='Legend color'><br>")		
							}
						}))
					}) 
					
					array.forEach(this.controls, lang.hitch(this,function(entry, groupid){
						if (entry.type == "group") {		
							if (entry.header != undefined){
								// Add header text and info icon
								if (entry.header[0].headerLevel == "main1"){
									hhtml = entry.header[0].text;
									mar = "margin-left:0px; margin-bottom:15px;height:25px;"
								}
								if (entry.header[0].headerLevel == "main"){
									hhtml = "<span id=" + this.sliderpane.id + "_header_" + groupid + " style='font-weight:bold;'>" + entry.header[0].text + "</span>"
									mar = "margin-left:0px;"
								}
								if (entry.header[0].headerLevel == "sub"){
									hhtml = "<hr style='background-color: #4a96de; height:1px; border:0; margin-top:-7px; margin-bottom:7px;" + 
									"background-image: -webkit-linear-gradient(left, #ccc, #4a96de, #ccc);background-image: -moz-linear-gradient(left, #ccc, #4a96de, #ccc);" + 
									"background-image: -ms-linear-gradient(left, #ccc, #4a96de, #ccc); background-image: -o-linear-gradient(left, #ccc, #4a96de, #ccc);'>" + entry.header[0].text + ": "
									mar = "margin-left:15px;"
								}
								nslidernodeheader = domConstruct.create("div", {
									id: this.sliderpane.id + "_" + groupid, 
									style:"display:" + entry.display + ';' + mar, 
									innerHTML: hhtml
								});
								this.sliderpane.domNode.appendChild(nslidernodeheader);	
								infoPic = domConstruct.create("a", {
									style: "color:black;",
									href: "#",
									title: "Click for more information",
									innerHTML: "<img src='data:image/png;base64,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'>"
								})
								if (entry.header[0].helpTitle != ""){
									nslidernodeheader.appendChild(infoPic);
								}
								on(infoPic, "click", lang.hitch(this,function(e){
									domStyle.set(this.infoarea.domNode, 'display', 'block');
									this.config.infoDisplay = "block";
									this.infoareacontent.innerHTML = "<b>" + entry.header[0].helpTitle + "</b><div style='height:8px'></div><div style='max-width:300px; max-height:530px;'>" + entry.header[0].helpText + "</div>";
									this.config.infoContent = this.infoareacontent.innerHTML
								}));
							}
			
							if ( entry.control == "radio" ) {
								ncontrolsnode = domConstruct.create("div", {
									id: this.sliderpane.id + entry.header[0].name + "_" + groupid,
									style: "margin-top:5px;margin-left:10px;"
								});
								nslidernodeheader.appendChild(ncontrolsnode);
								rlen = entry.options.length - 1;
								array.forEach(entry.options, lang.hitch(this,function(option, i){
									rorc = RadioButton;
									ncontrolnode = domConstruct.create("div");
									ncontrolsnode.appendChild(ncontrolnode); 
									parser.parse();
									ncontrol = new rorc({
										name: this.map.id + groupid,
										id: this.sliderpane.id + "_radio_" + groupid + "_" + i,
										value: option.value,
										index: this.map.id + groupid,
										title: option.text,
										checked: option.selected,
										onClick: lang.hitch(this,function(e) { 
											if(e) {
												this.radioClick(i, groupid, option.text, option.value, option.code);
											}
										})
									}, ncontrolnode);	
									if (rlen == i){	
										if (option.helpText != undefined){
											var htbr = "";
											var picbr = "<br><br>";
										}else{
											var htbr = "<br><br>";
										}	
										inhtml = "<span style='color:#000;' id='" + this.sliderpane.id + "_lvoption_" + groupid + "_" + i + "'> " + option.text + "</span>" + htbr
									}else{
										if (option.helpText != undefined){
											var htbr = "";
											var picbr = "<br>";
										}else{
											var htbr = "<br>";
										}
										inhtml = "<span style='color:#000;' id='" + this.sliderpane.id + "_lvoption_" + groupid + "_" + i + "'> " + option.text + "</span>"  + htbr
									}
									nslidernodeheader = domConstruct.create("div", {
										style:"display:inline;", 
										innerHTML: inhtml
									});									
									ncontrolsnode.appendChild(nslidernodeheader);
									
									infoPic = domConstruct.create("a", {
										style: "color:black;margin-left:3px !important;",
										href: "#",
										title: "Click for more information",
										innerHTML: "<img src='data:image/png;base64,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'>" + picbr
									})
									if (option.helpText != undefined){
										nslidernodeheader.appendChild(infoPic);
									}
									on(infoPic, "click", lang.hitch(this,function(e){
										domStyle.set(this.infopic.domNode, 'display', 'block');
										this.config.infoPicDisplay = "block";
										this.infoPicContent.innerHTML = "<img alt='infoPic' src='plugins/water_quality/images/" + option.helpText + ".jpg'>";
										this.config.infoPicContent = this.infoPicContent.innerHTML;
									}));
									
									parser.parse()	
								})); 
							}
							if ( entry.control == "checkbox" ) {
								this.checkbox = domConstruct.create("div", {
									id: this.sliderpane.id + "checkbox",
									style:"float:right; display:" + entry.display + "; text-align:left; padding:10px; margin-right:0px; border: 1pt solid #8d8d8d; box-shadow: 3px 3px 5px 0px rgba(102,102,102,0.7);", 
									innerHTML: "<div style='margin-bottom:10px;'><b>" + entry.headerText + "</b></div>"
								});
								this.sliderpane.domNode.appendChild(this.checkbox);
								rlen = entry.options.length - 1;
								array.forEach(entry.options, lang.hitch(this,function(option, i){
									ncontrolnode = domConstruct.create("div");
									this.checkbox.appendChild(ncontrolnode); 
									parser.parse();
									ncontrol = new CheckBox({
										name: this.map.id + groupid,
										id: this.sliderpane.id + "_cb_" + groupid + i,
										value: option.value,
										title: option.text,
										style: "margin-top:-5px !important;",
										checked: option.selected,
										onClick: lang.hitch(this,function(e) { 
											this.cbClick(option.value, e, i, groupid);
										})
									}, ncontrolnode);
									
									if (i == 0){
										ihtml = option.text + "<br><div style='height:5px;'></div>"
									}else{
										if (rlen == i){
											ihtml = option.text
										}else{
											ihtml = option.text + "<br><div style='height:5px;'></div>"
										}
									}
									
									nslidernodeheader = domConstruct.create("div", {
										style:"display:inline;margin-left:7px;", 
										innerHTML: ihtml
									});									
									this.checkbox.appendChild(nslidernodeheader); 
									
									parser.parse()	
								})); 
							}
							if ( entry.control == "checkboxExtra" ) {
								ncontrolsnode = domConstruct.create("div", {
									id: this.sliderpane.id + entry.header[0].name + "_" + groupid,
									style: "margin-top:5px;margin-left:10px;"							
								});
								nslidernodeheader.appendChild(ncontrolsnode);
							
								nslidernodeheader = domConstruct.create("div", {
									id: this.sliderpane.id + "stationText",
									style: "margin-left:10px; margin-top:0px; display:none;",
									innerHTML: "Click a station on the map to view historic trends and averages for that station.  You may select a different trait or year to customize the graph."	
								});
								this.sliderpane.domNode.appendChild(nslidernodeheader);
																
								array.forEach(entry.options, lang.hitch(this,function(option, i){
									ncontrolnode = domConstruct.create("div");
									ncontrolsnode.appendChild(ncontrolnode); 
									parser.parse();
									ncontrol = new CheckBox({
										name: this.map.id + groupid,
										id: this.sliderpane.id + "_cb_" + groupid + i,
										value: option.value,
										title: option.text,
										style: "margin-top:-5px !important;",
										checked: option.selected,
										onClick: lang.hitch(this,function(e) { 
											this.cbClick(option.value, e, i, groupid);
										})
									}, ncontrolnode);
									
									if (i == 0){
										ihtml = option.text + "<br><div style='height:5px;'></div>"
									}else{
										if (rlen == i){
											ihtml = option.text
										}else{
											ihtml = option.text + "<br><div style='height:5px;'></div>"
										}
									}
									
									nslidernodeheader = domConstruct.create("div", {
										style:"display:inline;margin-left:7px;", 
										innerHTML: ihtml
									});									
									ncontrolsnode.appendChild(nslidernodeheader); 
									
									parser.parse()	
								})); 
							}
						}			
						ncontrolsnode = domConstruct.create("div");
						this.sliderpane.domNode.appendChild(ncontrolsnode);
					}));
					// Add main dynamic map service
					this.currentLayer = new ArcGISDynamicMapServiceLayer(this.config.url);
					this.map.addLayer(this.currentLayer);
					on(this.currentLayer, "load", lang.hitch(this,function(e){
						this.wqArray = this.currentLayer.layerInfos
						//sample points
						samplePointsDialog = new TooltipDialog({
						  style: "position: absolute; max-width: 250px; font: normal normal normal 10pt Helvetica; z-index:100;"
						});
						samplePointsDialog.startup();
						this.map.graphics.on("mouse-out", lang.hitch(this,function(){
							if (this.config.graphicsTracker == "go"){
								map.graphics.clear();
								dijitPopup.close(hucDialog);
								dijitPopup.close(soilsDialog);
								dijitPopup.close(samplePointsDialog);
							}	
						}));
						var num = 0;
						$.each(this.wqArray, lang.hitch(this,function(i,v){
							if(v.name == "all_sample_points_web"){
								num = v.id	
							}	
						}))
						this.samplePoints = new FeatureLayer(this.config.url + "/" + num, {mode: esri.layers.FeatureLayer.MODE_SNAPSHOT, outFields: "*"});
						this.samplePoints.setRenderer(new SimpleRenderer(this.pntSym));
						this.samplePoints.on("mouse-over", lang.hitch(this,function(evt){
							this.map.setMapCursor("pointer");
						}));	
						this.samplePoints.on("mouse-out", lang.hitch(this,function(evt){
							this.map.setMapCursor("default");
						}));					
						this.samplePoints.on("click", lang.hitch(this,function(evt){
							this.map.graphics.clear();
							var t = "<div style='padding:6px;'>Station ID: <b>${Station_ID}</b><br>Trait: <b>${CharName}</b><br>Sample Year: <b>${samYr}</b><br>Results: <b>${result_num} ${SamUnits}</b></div>";
					  		var content = esriLang.substitute(evt.graphic.attributes,t);
							var highlightPoint = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 11,
								new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
								new Color([0,0,0]), 1.5),
								new Color([206,200,58,1]));
							var highlightPoint = new Graphic(evt.graphic.geometry,highlightPoint);
							map.graphics.add(highlightPoint);
							  
							samplePointsDialog.setContent(content);
			
							domStyle.set(samplePointsDialog.domNode, "opacity", 0.85);
							dijitPopup.open({
								popup: samplePointsDialog, 
								x: evt.pageX,
								y: evt.pageY
							});
						}));
						if (this.config.pointsVis == "block"){
							this.samplePoints.setDefinitionExpression(this.config.spDefEx);
							this.map.addLayer(this.samplePoints);
						}
						if (this.config.extent != ""){
							this.extentCheck = "first";
							var extent = new Extent(this.config.extent.xmin, this.config.extent.ymin, this.config.extent.xmax, this.config.extent.ymax, new SpatialReference({ wkid:4326 }))
							this.map.setExtent(extent, true);
							this.config.extent = "";
						}else{
							this.extentCheck = "second"	
							this.lyrExtent = this.currentLayer.fullExtent
							this.map.setExtent(this.lyrExtent, true)
						}
					}))
					// show elements based on config file
					if (this.config.supDataVis == "block"){
						$('#' + this.sliderpane.id + "checkbox").css("margin-top", - this.config.supDataMarTop + 'px');
						var h1 = $('#' + this.sliderpane.id + "checkbox").height();
						if (this.config.supDataMarTop < h1){
							var nh = 136 - this.config.supDataMarTop;
							$('#' + this.sliderpane.id + "_4").css("margin-top", nh + "px");
						}
					}	
					if (this.config.visibleLayers != []){	
						this.currentLayer.setVisibleLayers(this.config.visibleLayers);
					}
					this.lastLookup = "";
					
					// HUC 8 zoom
					this.huc8 = new FeatureLayer(this.config.url + "/1", { mode: esri.layers.FeatureLayer.MODE_SELECTION, outFields: "*"});
					dojo.connect(this.huc8, "onSelectionComplete", lang.hitch(this,function(f){
						var huc8Extent = f[0].geometry.getExtent().expand(1.5); 
						this.map.setExtent(huc8Extent, true); 
					}));
					
					// HUC12 
					this.huc12 = new FeatureLayer(this.config.url + "/0", { mode: esri.layers.FeatureLayer.MODE_SNAPSHOT, outFields: "*"});
					this.huc12.setRenderer(new SimpleRenderer(this.hucSym));
					this.map.infoWindow.resize(245,125);
        			hucDialog = new TooltipDialog({
					  style: "position: absolute; max-width: 500px; font: normal normal normal 10pt Helvetica; z-index:100;"
					});
					hucDialog.startup();
					var map = this.map
					
					this.huc12.on("mouse-over", lang.hitch(this,function(evt){
						this.map.setMapCursor("pointer");
					}));	
					this.huc12.on("mouse-out", lang.hitch(this,function(evt){
						this.map.setMapCursor("default");
					}));					
					this.huc12.on("click", lang.hitch(function(evt){
						var acres = numberWithCommas(evt.graphic.attributes.ACRES)	
						var t = "<div style='padding:6px;'>HUC 12: <b>${HUC_12}</b><br>Acres: <b>" + acres + "</b><br>Subwatershed: <b>${SUBWATERSHED}</b></div>";
			  
						var content = esriLang.substitute(evt.graphic.attributes,t);
						var highlightSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, 
							new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, 
							new Color([64,82,180]), 2), 
							new Color([236,239,222,0]));
						var highlightGraphic = new Graphic(evt.graphic.geometry,highlightSymbol);
						map.graphics.add(highlightGraphic);
					  
						hucDialog.setContent(content);
	
						domStyle.set(hucDialog.domNode, "opacity", 0.85);
						dijitPopup.open({
							popup: hucDialog, 
							x: evt.pageX,
							y: evt.pageY
						});
					}));
					
					// soils popup
					soilsDialog = new TooltipDialog({
					  style: "position: absolute; max-width: 250px; font: normal normal normal 10pt Helvetica; z-index:100;"
					});
					soilsDialog.startup();
					this.soils = new FeatureLayer(this.config.url + "/0", {mode: esri.layers.FeatureLayer.MODE_ONDEMAND, opacity: "0", outFields: "*"});
					
					// check if legend should be visible
					if (this.config.legendVis == "block"){
						$('#' + this.sliderpane.id + "_jsonLegend").html(this.config.legendHtml)
					//	var h = $('#' + this.sliderpane.id + "level_3_2").height() - 2
					//	$('#' + this.sliderpane.id + "_jsonLegend").css("margin-top", -h + 'px')
						$('#' + this.sliderpane.id + "_jsonLegend").show()
					}
					if (this.config.huc12Vis == "block"){
						this.huc12.setDefinitionExpression("HUC_8 = '" + this.config.huc12Exp + "'");
						this.map.addLayer(this.huc12);
					}		
					this.resize();
					
					//sampling stations layer
					this.samplingStations = new FeatureLayer(this.config.url + "/3", { mode: esri.layers.FeatureLayer.MODE_SNAPSHOT, outFields: "*"});
					this.samplingStations.setRenderer(new SimpleRenderer(this.stationSym));
					this.samplingStations.on("mouse-over", lang.hitch(this,function(evt){
						this.map.setMapCursor("pointer");
					}));
					this.samplingStations.on("mouse-out", lang.hitch(this,function(evt){
						this.map.setMapCursor("default");
					}));
					this.samplingStations.on("click", lang.hitch(this,function(evt){
						this.map.graphics.clear();
						this.config.spAtts = evt.graphic.attributes;
						$('#' + this.sliderpane.id + 'chartHeader').html("Station ID " + evt.graphic.attributes.Station_ID + ": Select available traits on bar below")
						this.checkTraits(this.config.spAtts);
						var spHlGraphic = new Graphic(evt.graphic.geometry,this.hlStationPoint);
						this.map.graphics.add(spHlGraphic);
						$('#' + this.c).slideDown('slow');
						this.config.graphsVis = "block"
					}));
					if (this.config.stationsVis == "block"){
						$('#' + this.sliderpane.id + 'stationText').slideDown();
						$('#' + this.sliderpane.id + 'stationLegend').show()
						this.map.addLayer(this.samplingStations);
					}	
					
					//sampling station bar chart clicks
					dojo.query(".buttonBar__button").connect("onclick", lang.hitch(this,function(e){
						var btnch = $('#' + this.sliderpane.id + 'traitBar').find('.buttonBar__button');
						$.each(btnch, function(i,v){
							$('#' + v.id).removeClass('buttonBar__selected')
						})
						var temp = e.target.id
						$('#' + temp).addClass('buttonBar__selected');
						
						this.config.tid = temp.split("-").pop();
						var val = this.config.tid.slice(0,-4) + "value"
						this.config.mean = JSON.parse(this.config.spAtts[this.config.tid])
						this.config.val = JSON.parse(this.config.spAtts[val])						
						this.config.a = this.massageArray()
						this.updateChart(this.config.a)  
					}))
					$('.slText').click(lang.hitch(this,function(e){
						if ($(e.target).parent('.dis').length == 0){
							var c = $('#' + this.sliderpane.id + 'smLabelDiv').find('.slText')
							$.each(c, lang.hitch(this,function(i,v){
								$(v).parent('.smallLabels').removeClass('buttonBar__selected')
							}))
							
							$(e.target).parent('.smallLabels').addClass('buttonBar__selected')
							this.config.year = $(e.target).html();
							this.updateLineChart()
							var c1 = $('#' + this.sliderpane.id + 'meanBarDiv').find('.meanBars')
							$.each(c1, lang.hitch(this,function(i, v) {
								if (v.id.substr(v.id.length - 4) == this.config.year){
									$('#' + v.id).addClass('selBar')
								}else{								
									$('#' + v.id).removeClass('selBar')
								}
							}));
						}
					}));	
					$('.meanBars').click(lang.hitch(this,function(e){
						if ($('#' + e.target.id).height() > 0){
							//add and remove classes
							var c = $('#' + this.sliderpane.id + 'meanBarDiv').find('.meanBars')
							$.each(c, function(i, v) {
								$('#' + v.id).removeClass('selBar')
							});
							$('#' + e.target.id).addClass('selBar');
							
							// get year
							var tid = e.target.id
							this.config.year = tid.substr(tid.length - 4);
							this.updateLineChart()
							
							var c1 = $('#' + this.sliderpane.id + 'smLabelDiv').find('.slText')
							$.each(c1, lang.hitch(this,function(i,v){
								if ($(v).html() == this.config.year){
									$(v).parent('.smallLabels').addClass('buttonBar__selected')
								}else{
									$(v).parent('.smallLabels').removeClass('buttonBar__selected')
								}
							}))
						}
					}));
					
					//Show graphs from state
					if (this.config.graphsVis == "block"){
						this.checkTraits(this.config.spAtts);  
						$('#' + this.c).slideDown('slow');
					}	
					
					//Build legend from state
					if (this.config.legendVis == "block"){
						$('#' + this.sliderpane.id + '_jsonLegend').empty();
						$.getJSON( "http://50.18.215.52/arcgis/rest/services/Louisiana_Freshwater/NRCS_Water_Quality/MapServer/legend?f=pjson", lang.hitch(this,function( json ) {
							var matchArray = [];
							//get legend pics
							array.forEach(json.layers, lang.hitch(this,function(v, i){
								if (v.layerId == this.config.layerId){
									matchArray.push(v)
								}	
							}))
							//huc12 and selected layer legend
							var units = "mg/L"
							if (this.config.trait == "TUR"){
								units = "NTU";
							}	
							$('#' + this.sliderpane.id + '_jsonLegend').append("<span style='text-decoration:underline;font-weight:bold;margin-top:5px;'>" + this.config.layerType + " (" + units + ")</span><br>" )
							array.forEach(matchArray[0].legend, lang.hitch(this,function(v, i){
								$('#' + this.sliderpane.id + '_jsonLegend').append("<p style='display:inline;'>" + v.label + "</p><img style='margin-bottom:-5px; margin-left:5px;' src='data:image/png;base64," + v.imageData + "' alt='Legend color'><br>")		
							}))	
							
							$('#' + this.b).show()
							$('#' + this.sliderpane.id + '_jsonLegend').show()
							//clickable legend vis
							if (this.config.clickableVis == "block"){
								$('#' + this.b).css("width", '320px')
								$('#' + this.sliderpane.id + '_jsonLegend1').show()
								if (this.config.huc12Vis == "block"){
									$('#' + this.sliderpane.id + 'hucLegend').show();
								}
								if (this.config.soilsVis == "block"){
									$('#' + this.sliderpane.id + 'soilsLegend').show();
								}
								if (this.config.pointsVis == "block"){
									$('#' + this.sliderpane.id + 'spntLegend').show();
								}
								if (this.config.stationsVis == "block"){
									$('#' + this.sliderpane.id + 'stationLegend').show();
								}
							}else{									
								$('#' + this.b).css("width", '170px')
							}
							//land cover legend vis 
							var h = $('#' + this.sliderpane.id + '_jsonLegend').height() + 70;								
							if (this.config.landCoverVis == "block"){
								var w = $('#' + this.b).width() + 335
								$('#' + this.b).css("width", w + 'px');
								if (h < 280){
									$('#' + this.b).css("height", 280 + 'px');
								}else{
									$('#' + this.b).css("height", h + 'px');
								}
								$('#' + this.sliderpane.id + '_landCoverLegend').show()								
							}else{ 
								$('#' + this.b).css("height", h + 'px')
							}
						})) 
						this.lastLookup = this.config.lookup2;
					}
				},	
				
				checkTraits: function(atts){
					var c = $('#' + this.sliderpane.id + 'meanBarDiv').find('.meanBars')
					$.each(c, function(i, v){
						$('#' + v.id).removeClass('selBar');							
					});
					
					var ta = ["DOmean", "Nmean", "Pmean", "TDSmean", "TSSmean", "TURmean"]
					var taIn = []
					$.each(ta, lang.hitch(this,function(i,v){
						a = JSON.parse(atts[v])
						$.each(a, lang.hitch(this,function(j,w){
							if (w != -99){
								taIn.push(v)
								return false				
							}	
						}));
					}))	
					var taOut = $(ta).not(taIn).get();
					this.config.tid = ""
					$.each(taIn, lang.hitch(this,function(i,v){
						$('#' + this.sliderpane.id + '-' + v).prop('disabled', false);
						if (v == this.config.trait + "mean"){
							this.config.tid = v	
						}	
					}));
					$.each(taOut, lang.hitch(this,function(i,v){
						$('#' + this.sliderpane.id + '-' + v).prop('disabled', true);
					}));
					if (this.config.tid == ""){
						this.config.tid = taIn[0]
					}	
					var val = this.config.tid.slice(0,-4) + "value"
					this.config.mean = JSON.parse(this.config.spAtts[this.config.tid])
					this.config.val = JSON.parse(this.config.spAtts[val])
					this.config.a = this.massageArray()
					this.updateChart(this.config.a)
					var btnch = $('#' + this.sliderpane.id + 'traitBar').find('.buttonBar__button');
					$.each(btnch, function(i,v){
						$('#' + v.id).removeClass('buttonBar__selected')
					})
					$('#' + this.sliderpane.id + "-" + this.config.tid).addClass('buttonBar__selected');					
				},	
				
				massageArray: function(){
					var a = []
					var num = 1
					var lar = Math.max.apply(Math, this.config.mean);
					if (this.config.tid == "DOmean"){
						num = 12
						$('#' + this.sliderpane.id + 'hLbl').html('12mg/L')
						$('#' + this.sliderpane.id + 'mLbl').html('9mg/L')
						$('#' + this.sliderpane.id + 'lLbl').html('6mg/L')
						$('#' + this.sliderpane.id + 'uLbl').html('3mg/L')
					}		
					if (this.config.tid == "Nmean"){
						num = 6
						$('#' + this.sliderpane.id + 'hLbl').html('6mg/L')
						$('#' + this.sliderpane.id + 'mLbl').html('4.5mg/L')
						$('#' + this.sliderpane.id + 'lLbl').html('3mg/L')
						$('#' + this.sliderpane.id + 'uLbl').html('1.5mg/L')
					}	
					if (this.config.tid == "Pmean"){
						num = 0.8
						$('#' + this.sliderpane.id + 'hLbl').html('0.8mg/L')
						$('#' + this.sliderpane.id + 'mLbl').html('0.6mg/L')
						$('#' + this.sliderpane.id + 'lLbl').html('0.4mg/L')
						$('#' + this.sliderpane.id + 'uLbl').html('0.2mg/L')
					}		
					if (this.config.tid == "TDSmean"){
						num = 20000
						$('#' + this.sliderpane.id + 'hLbl').html('20,000mg/L')
						$('#' + this.sliderpane.id + 'mLbl').html('15,000mg/L')
						$('#' + this.sliderpane.id + 'lLbl').html('10,000mg/L')
						$('#' + this.sliderpane.id + 'uLbl').html('5,000mg/L')
					}
					if (this.config.tid == "TSSmean"){
						num = 200
						$('#' + this.sliderpane.id + 'hLbl').html('200mg/L')
						$('#' + this.sliderpane.id + 'mLbl').html('150mg/L')
						$('#' + this.sliderpane.id + 'lLbl').html('100mg/L')
						$('#' + this.sliderpane.id + 'uLbl').html('50mg/L')
					}	
					if (this.config.tid == "TURmean"){
						num = 500
						$('#' + this.sliderpane.id + 'hLbl').html('500 NTU')
						$('#' + this.sliderpane.id + 'mLbl').html('375 NTU')
						$('#' + this.sliderpane.id + 'lLbl').html('250 NTU')
						$('#' + this.sliderpane.id + 'uLbl').html('125 NTU')
					}	
					$.each(this.config.mean, function(i, v) {
						if (v == -99){
							a.push(0)
						}else{
							var n = v / num * 100
							if (n < 2){ n = 2 }
							a.push(n)
						}
					})	
					return a
				},
				
				updateChart: function(a){
					$('#' + this.sliderpane.id + 'mean1995').animate({ 'height': a[0] + '%'});
					$('#' + this.sliderpane.id + 'mean1996').animate({ 'height': a[1] + '%'});
					$('#' + this.sliderpane.id + 'mean1997').animate({ 'height': a[2] + '%'});
					$('#' + this.sliderpane.id + 'mean1998').animate({ 'height': a[3] + '%'});
					$('#' + this.sliderpane.id + 'mean1999').animate({ 'height': a[4] + '%'});
					$('#' + this.sliderpane.id + 'mean2000').animate({ 'height': a[5] + '%'});
					$('#' + this.sliderpane.id + 'mean2001').animate({ 'height': a[6] + '%'});
					$('#' + this.sliderpane.id + 'mean2002').animate({ 'height': a[7] + '%'});
					$('#' + this.sliderpane.id + 'mean2003').animate({ 'height': a[8] + '%'});
					$('#' + this.sliderpane.id + 'mean2004').animate({ 'height': a[9] + '%'});
					$('#' + this.sliderpane.id + 'mean2005').animate({ 'height': a[10] + '%'});
					$('#' + this.sliderpane.id + 'mean2006').animate({ 'height': a[11] + '%'});
					$('#' + this.sliderpane.id + 'mean2007').animate({ 'height': a[12] + '%'});
					$('#' + this.sliderpane.id + 'mean2008').animate({ 'height': a[13] + '%'});
					$('#' + this.sliderpane.id + 'mean2009').animate({ 'height': a[14] + '%'});
					$('#' + this.sliderpane.id + 'mean2010').animate({ 'height': a[15] + '%'});
					$('#' + this.sliderpane.id + 'mean2011').animate({ 'height': a[16] + '%'});
					$('#' + this.sliderpane.id + 'mean2012').animate({ 'height': a[17] + '%'});
					$('#' + this.sliderpane.id + 'mean2013').animate({ 'height': a[18] + '%'});
					$('#' + this.sliderpane.id + 'mean2014').animate({ 'height': a[19] + '%'}, 1000, "linear", lang.hitch(this,function() {
						this.checkSelectedBar();
					}));
					
				},	
				
				checkSelectedBar: function(){			
					var c = $('#' + this.sliderpane.id + 'meanBarDiv').find('.meanBars')
					var keepYear = ""
					outYears = []
					$.each(c, lang.hitch(this,function(i, v){
						if ($('#' + v.id).height() > 0){
							if (v.id.substr(v.id.length - 4) == this.config.year){
								keepYear = this.config.year	
								$('#' + v.id).addClass('selBar');
							}	
						}else{
							outYears.push(v.id.substr(v.id.length - 4))
						}	
					}));
					var sl = $('#' + this.sliderpane.id + 'smLabelDiv').find('.slText')
					$.each(sl, lang.hitch(this,function(i,v){
						$(v).parent('.smallLabels').removeClass('dis')
						$(v).removeClass('disText')
					}));	
					$.each(sl, lang.hitch(this,function(i,v){
						$.each(outYears, lang.hitch(this,function(j,w){
							if ($(v).html() == w){
								$(v).parent('.smallLabels').addClass('dis')	
								$(v).addClass('disText')									
							}
						}));	
					}));
					if (keepYear != ""){
						this.config.year = keepYear	
					}else{	
						var yid = ""
						$.each(c, function(i, v){
							$('#' + v.id).removeClass('selBar');
						})						
						$.each(c, function(i, v){
							if ($('#' + v.id).height() > 0){
								$('#' + v.id).addClass('selBar');
								yid = v.id
								return false
							}								
						});
						this.config.year = yid.substr(yid.length - 4);							
					}
					var c1 = $('#' + this.sliderpane.id + 'smLabelDiv').find('.slText')
					$.each(c1, lang.hitch(this,function(i, v){
						if ($(v).html() == this.config.year){
							$(v).parent('.smallLabels').addClass('buttonBar__selected')
						}else{
							$(v).parent('.smallLabels').removeClass('buttonBar__selected')
						}
					}));

					this.updateLineChart()
				},
				
				updateLineChart: function(){
					var d = []
					$.each(this.config.val, lang.hitch(this,function(i,v){
						if (this.config.year == v[0]){
							d = v
						}
					}));
					$.each(d, function(i,v){
						if (v == -99){
							d[i] = null;
						}
					});
					var e = d.slice(1)
					var data = {
					  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
					  series: [e]
					};
					var options = {
					  width: 580,
					  height: 145
					};
					new Chartist.Line('#' + this.sliderpane.id + 'lineChart', data, options);
					var units = "(mg/L)"
					if (this.config.tid == "TURmean"){
						units = "(NTU)"
					}
					$('#' + this.sliderpane.id + 'lineChartTitle').html("Monthly Readings Taken in " + this.config.year + " " + units) 
				},
				
				radioClick: function(val, group, text, abbr, code) {
					if (text.length == 4){
						this.config.rasterYear = text;
					}	
					//set all radio buttons in group to false
					var reChanges = [];
					array.forEach(this.controls[group].options, lang.hitch(this,function(option, i){
						option.selected = false;
					}));
					this.controls[group].options[val].selected = true;
					
					// build lookup string based on level
					this.level = this.controls[group].level;
					if (this.level == 1){
						this.map.graphics.clear();
						this.config.lookup1 = abbr;
						this.huc12.setDefinitionExpression("HUC_8 = '" + code + "'");
						this.selectHuc8 = new esriQuery();
						this.selectHuc8.where = "SUBBASIN = '" + text + "'";
						this.huc8.selectFeatures(this.selectHuc8, FeatureLayer.SELECTION_NEW); 
						this.code = code;
						$('#' + this.sliderpane.id + "checkbox").hide('slow');
						this.config.controls[3].display == "none";
						this.config.supDataVis = "none";
						$('#' + this.sliderpane.id + "_4").css("margin-top", "5px");
					}
					if (this.level == 2){
						this.config.traits = [];
						this.config.trait = abbr;
						this.parentLayerId = 0;
						this.config.layerType = text;
						this.config.lookup2 = this.config.lookup1 + "_" + abbr
						array.forEach(this.wqArray, lang.hitch(this,function(v, i){
							var wn = v.name
							var n = wn.substring(0, wn.length - 5)
							if (this.config.lookup2 == n){
								var y = wn.slice(-4)
								this.parentLayerId = v.parentLayerId
								this.config.traits.push([y, v.id])
							}	
						}));
						$('#' + this.sliderpane.id + "_header_2").text("3. Show " + this.wqArray[this.parentLayerId].name + " by year")
						//$('#' + this.sliderpane.id + "level_3_2").empty()
						var myNode = document.getElementById(this.sliderpane.id + "level_3_2");
						myNode.innerHTML = '';
						this.controls[2].options = []
						array.forEach(this.config.traits, lang.hitch(this,function(v,i){
							this.controls[2].options.push({"text": this.config.traits[i][0], "selected": false, "value": this.config.traits[i][1], "showData": "yes", "groupsBelow" : "no"});
						}));
						array.forEach(this.controls[2].options, lang.hitch(this,function(option,i){	
							rorc = RadioButton;
							ncontrolnode = domConstruct.create("div");
							$('#' + this.sliderpane.id + "level_3_2").append(ncontrolnode); 
							parser.parse();
							var groupid = 2;
							ncontrol = new rorc({
								name: this.map.id + groupid,
								//id: this.sliderpane.id + "_radio_" + groupid + "_" + i,
								value: option.value,
								index: this.map.id + groupid,
								title: option.text,
								checked: option.selected,
								onClick: lang.hitch(this,function(e) { 
									if(e) {
										this.radioClick(i, groupid, option.text, option.value);
									}
								})
							}, ncontrolnode);
							nslidernodeheader = domConstruct.create("div", {
								style:"display:inline;", 
								innerHTML: "<span>" + option.text + "</span><br>"
							});									
							$('#' + this.sliderpane.id + "level_3_2").append(nslidernodeheader);							
						}));
						if (this.marginMaker != undefined){
							var h = $('#' + this.marginMaker).height() - 2
							$('#' + this.sliderpane.id + "checkbox").css("margin-top", -h + 'px')
							this.config.supDataMarTop = h + 10;
							var h1 = $('#' + this.sliderpane.id + "checkbox").height();
							console.log(h + " " + h1)
							if (h < h1){
								var nh = 156 - h 
								console.log(nh)
								$("#" + this.sliderpane.id + "_4").css("margin-top", nh + "px");
							}
						}else{
							console.log("made it")
							$('#' + this.sliderpane.id + "_4").css("margin-top", "15px");
						}
						$('#' + this.sliderpane.id + "_4").css("margin-top", "15px");
						$('#' + this.sliderpane.id + "_jsonLegend").hide();
						
					}
					
					if (this.controls[group].options[val].showData == "yes"){
						this.config.huc12Exp = this.code;
						// build legend for raster
						this.config.layerId = abbr
						if (this.lastLookup != this.config.lookup2){
							$('#' + this.sliderpane.id + '_jsonLegend').empty();
							$.getJSON( "http://50.18.215.52/arcgis/rest/services/Louisiana_Freshwater/NRCS_Water_Quality/MapServer/legend?f=pjson", lang.hitch(this,function( json ) {
								var matchArray = [];
								//get legend pics
								array.forEach(json.layers, lang.hitch(this,function(v, i){
									if (v.layerId == this.config.layerId){
										matchArray.push(v)
									}	
								}))
								//huc12 and selected layer legend
								var units = "mg/L"
								if (this.config.trait == "TUR"){
									units = "NTU";
								}	
								$('#' + this.sliderpane.id + '_jsonLegend').append("<span style='text-decoration:underline;font-weight:bold;margin-top:5px;'>" + this.config.layerType + " (" + units + ")</span><br>" )
								array.forEach(matchArray[0].legend, lang.hitch(this,function(v, i){
									$('#' + this.sliderpane.id + '_jsonLegend').append("<p style='display:inline;'>" + v.label + "</p><img style='margin-bottom:-5px; margin-left:5px;' src='data:image/png;base64," + v.imageData + "' alt='Legend color'><br>")		
								}))	
								
								$('#' + this.b).show()
								$('#' + this.sliderpane.id + '_jsonLegend').show()
								if (this.config.stationsVis == "block"){
									$('#' + this.b).css("width", '320px')
								}else{									
									$('#' + this.b).css("width", '170px')
								}
								var h = $('#' + this.sliderpane.id + '_jsonLegend').height() + 70;								
								if (this.config.landCoverVis == "block"){
									var w = $('#' + this.b).width() + 335
									$('#' + this.b).css("width", w + 'px');
									if (h < 280){
										$('#' + this.b).css("height", 280 + 'px');
									}else{
										$('#' + this.b).css("height", h + 'px');
									}		
								}else{ 
									$('#' + this.b).css("height", h + 'px')
								}
							})) 
							this.lastLookup = this.config.lookup2;
						}
						
						this.marginMaker = this.sliderpane.id + "level_3_2"
						this.config.legendVis = "block"
						//supplemental data box placement
						var h = $('#' + this.marginMaker).height() - 2
						var h1 = $('#' + this.sliderpane.id + "checkbox").height();
						$('#' + this.sliderpane.id + "checkbox").css("margin-top", -h + 'px')
						this.config.supDataMarTop = h + 10;
						$('#' + this.sliderpane.id + "checkbox").show()
						this.config.controls[3].display == "block";
						this.config.supDataVis = "block";
						if (h < h1){
							var nh = 136 - h 
							$('#' + this.sliderpane.id + "_4").css("margin-top", nh + "px");  	
						}	
													
						
						this.config.visibleLayers = [];	
						this.currentLayer.setVisibleLayers(this.config.visibleLayers);
						
						this.config.visibleLayers.push(1);
						this.config.visibleLayers.push(abbr);
						if (this.config.landCoverVis == "block"){
							this.config.visibleLayers.push(this.config.landCoverId);
						}	
						this.currentLayer.setVisibleLayers(this.config.visibleLayers);
						// update definition expression for sample points
						this.config.spDefEx = "raster = '" + this.config.lookup2 + "_" + this.config.rasterYear + "'";
						this.samplePoints.setDefinitionExpression(this.config.spDefEx);
					}
					if (this.controls[group].options[val].showData == "no"){
						array.forEach(this.controls[3].options, lang.hitch(this,function(v, i){
							v.selected = false;
							var cb = dijit.byId(this.sliderpane.id + "_cb_3" + i);
							if (cb != undefined){
								cb.set('checked', false);
							}
						}));
						this.config.visibleLayers = [1];
						this.currentLayer.setVisibleLayers(this.config.visibleLayers);
						if (this.config.stationsVis == "block"){
							$('#' + this.sliderpane.id + '_landCoverLegend, #' + this.sliderpane.id + 'soilsLegend, #' + this.sliderpane.id + 'spntLegend, #' + this.sliderpane.id + 'hucLegend').hide();
						}else{	
							$('#' + this.b + ', #' + this.sliderpane.id + '_jsonLegend1, #' + this.sliderpane.id + '_landCoverLegend, #' + this.sliderpane.id + 'soilsLegend, #' + this.sliderpane.id + 'spntLegend, #' + this.sliderpane.id + 'hucLegend' + this.sliderpane.id + 'stationLegend').hide();
							this.config.clickableVis = "none"
						}
						this.config.landCoverVis = "none"
						this.config.huc12Vis = "none"						
						this.config.soilsVis = "none"
						this.config.pointsVis = "none"
						this.map.removeLayer(this.soils);
						this.map.removeLayer(this.huc12);
						this.map.removeLayer(this.samplePoints);
						this.config.huc12Exp = "";
					}
					if (this.controls[group].options[val].groupsBelow == "yes"){
						//get value and current level
						this.value = this.controls[group].options[val].value;
						//this.level = this.controls[group].level;
						this.nextLevel = this.level + 1;
						this.lastLevel = this.level + 2;
						// clear selections on level greater than clicked level
						array.forEach(this.controls, lang.hitch(this,function(entry, groupid){
							if (entry.level > this.level){
								array.forEach(entry.options, lang.hitch(this,function(option, i){
									option.selected = false;
									var cb = dijit.byId(this.sliderpane.id + "_radio_" + groupid + "_" + i);
									if (cb != undefined){
										dijit.byId(this.sliderpane.id + "_radio_" + groupid + "_" + i).set('checked', false);
									}	
								}));
							}
							if (entry.level > this.nextLevel){
								$('#' + this.sliderpane.id + "_" + groupid).hide('slow');
								this.controls[groupid].display = "none";
							}
						}));
						array.forEach(this.controls, lang.hitch(this,function(entry, groupid){
							if (entry.level == this.nextLevel){
								$('#' + this.sliderpane.id + "_" + groupid).show('slow');
								this.controls[groupid].display = "block";
							}
							if (entry.level == this.lastLevel){
								$('#' + this.sliderpane.id + "_" + groupid).hide('slow');
								this.controls[groupid].display = "none";
							}
						}));
					}
					
				},
				
				cbClick: function(v, e, i, gid) {
					this.config.controls[gid].options[i].selected = true;
					if (e.target.checked == true){
						if (v == "huc12" || v == "soilsData" || v == "samplingStations" || v == "samplePoints"){
							if (this.config.clickableVis == "none"){
								$('#' + this.b).show()
								var w = $('#' + this.b).width() + 170
								$('#' + this.b).css("width", w + 'px');
								$('#' + this.sliderpane.id + "_jsonLegend1").show();
								this.config.clickableVis = "block";
								if (this.config.landCoverVis == "none"){
									var h = $('#' + this.sliderpane.id + "_jsonLegend").height() + 60
									var h1 = $('#' + this.sliderpane.id + "_jsonLegend1").height() + 60
									if (h < h1){
										$('#' + this.b).css("height", h1 + 'px');	
									}else{
										$('#' + this.b).css("height", h + 'px');
									}
								}	
							}
						}						
						if (v == "huc12"){
							this.config.graphicsTracker = "go"
							this.config.huc12Vis = "block"
							$('#' + this.sliderpane.id + 'hucLegend').show()
							this.map.addLayer(this.huc12);
							this.huc12.setDefinitionExpression("HUC_8 = '" + this.code + "'");
						}
						if (v == "landCover"){
							this.config.landCoverVis = "block"
							var lu = this.config.lookup1 + " Land Cover"
							array.forEach(this.wqArray, lang.hitch(this,function(v, i){
								if (v.name == lu){
									this.config.landCoverId = v.id
								}
							}));		
							this.config.visibleLayers.push(this.config.landCoverId);
							this.currentLayer.setVisibleLayers(this.config.visibleLayers);
							var w = $('#' + this.b).width() + 335
							$('#' + this.b).css("width", w + 'px');
							$('#' + this.sliderpane.id + "_landCoverLegend").show();
							var h = $('#' + this.sliderpane.id + "_jsonLegend").height() + 60
							if (h < 280){
								$('#' + this.b).css("height", 280 + 'px');	
							}else{
								$('#' + this.b).css("height", h + 'px');
							}		
							
						}
						if (v == "samplePoints"){
							this.config.graphicsTracker = "go"
							this.config.pointsVis = "block"	
							$('#' + this.sliderpane.id + 'spntLegend').show()
							this.map.addLayer(this.samplePoints);
							this.config.spDefEx = "raster = '" + this.config.lookup2 + "_" + this.config.rasterYear + "'";
							this.samplePoints.setDefinitionExpression(this.config.spDefEx);
						}	
						if (v == "soilsData"){
							this.config.graphicsTracker = "go"
							this.config.soilsVis = "block"
							$('#' + this.sliderpane.id + 'soilsLegend').show()
							var lu = this.config.lookup1 + "_soils_web"
							array.forEach(this.wqArray, lang.hitch(this,function(v, i){
								if (v.name == lu){
									this.config.soilsId = v.id
								}
							}));		
							this.config.visibleLayers.push(this.config.soilsId);
							this.currentLayer.setVisibleLayers(this.config.visibleLayers);
							
							this.soils = new FeatureLayer(this.config.url + "/" + this.config.soilsId, {
								mode: esri.layers.FeatureLayer.ONDEMAND,
								opacity: "0",
								outFields: "*"
							});
							this.soils.setRenderer(new SimpleRenderer(this.soilsSym));
							this.soils.on("mouse-over", lang.hitch(this,function(evt){
								this.map.setMapCursor("pointer");
							}));
							this.soils.on("mouse-out", lang.hitch(this,function(evt){
								this.map.setMapCursor("default");
							}));
							this.soils.on("mouse-down", lang.hitch(this,function(evt){
								atts = evt.graphic.attributes;
								this.map.graphics.clear();
								this.soilsGraphic = new Graphic(evt.graphic.geometry,this.soilsSym);
								this.map.graphics.add(this.soilsGraphic);
								var t = "<div style='padding:6px;'>Soil Type: <b>${Map_unit_n}</b></div>";
								var content = esriLang.substitute(evt.graphic.attributes,t);
								soilsDialog.setContent(content);
								domStyle.set(soilsDialog.domNode, "opacity", 0.85);
								dijitPopup.open({
									popup: soilsDialog, 
									x: evt.pageX,
									y: evt.pageY
								});
								dojo.stopEvent(evt)
							}));
							this.map.addLayer(this.soils);
							
						}
						if (v == "samplingStations"){
							$('#' + this.sliderpane.id + 'stationText').slideDown();
							this.config.graphicsTracker = "sp"
							$('#' + this.sliderpane.id + 'stationLegend').show()
							this.config.stationsVis = "block"	
							this.map.addLayer(this.samplingStations);
						}			
					}else{
						this.config.controls[gid].options[i].selected = false;
						if (v == "huc12"){
							this.config.huc12Vis = "none";
							$('#' + this.sliderpane.id + 'hucLegend').hide();
							this.map.removeLayer(this.huc12);
						}
						if (v == "landCover"){
							this.config.landCoverVis = "none"
							var index = this.config.visibleLayers.indexOf(this.config.landCoverId);
							if (index > -1) {
								this.config.visibleLayers.splice(index, 1);
								this.currentLayer.setVisibleLayers(this.config.visibleLayers);
							}
							$('#' + this.sliderpane.id + "_landCoverLegend").hide();
							var w = $('#' + this.b).width() - 320
							$('#' + this.b).css("width", w + 'px');
							var h = $('#' + this.sliderpane.id + "_jsonLegend").height() + 60
							$('#' + this.b).css("height", h + 'px');
						}
						if (v == "soilsData"){
							this.config.soilsVis = "none";
							$('#' + this.sliderpane.id + 'soilsLegend').hide()	
							var index = this.config.visibleLayers.indexOf(this.config.soilsId);
							if (index > -1) {
								this.config.visibleLayers.splice(index, 1);
								this.currentLayer.setVisibleLayers(this.config.visibleLayers);
							}
							this.map.removeLayer(this.soils);				
						}

						if (v == "samplePoints"){
							this.config.pointsVis = "none"	
							$('#' + this.sliderpane.id + 'spntLegend').hide()
							this.map.removeLayer(this.samplePoints);
							console.log(this.samplePoints);
						}
						if (v == "samplingStations"){
							$('#' + this.sliderpane.id + 'stationText').slideUp();
							this.config.stationsVis = "none";
							$('#' + this.sliderpane.id + 'stationLegend').hide()							
							var index = this.config.visibleLayers.indexOf(this.spId);
							if (index > -1) {
								this.config.visibleLayers.splice(index, 1);
								this.currentLayer.setVisibleLayers(this.config.visibleLayers);
							}	
							this.map.removeLayer(this.samplingStations);	
							this.map.graphics.clear();							
						}
						if (v == "huc12" || v == "soilsData" || v == "samplingStations" || v == "samplePoints"){
							if (this.config.soilsVis == "none" && this.config.pointsVis == "none" && this.config.huc12Vis == "none" && this.config.stationsVis == "none"){
								var w = $('#' + this.b).width() - 155;		
								$('#' + this.b).css("width", w + 'px');
								$('#' + this.sliderpane.id + "_jsonLegend1").hide();
								this.config.clickableVis = "none"
							}	
						}
					}		
				},	
				
				getState: function () {
					this.config.extent = this.map.geographicExtent;
					var state = new Object();
					state = this.config;
					return state;
				},
				
				setState: function (state) {
					this.stateSet = "set";
					this.config = state;	
					this.controls = this.config.controls;
				}	
           });
       });	   
function makeid(){
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

    for( var i=0; i < 5; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}
function unique(list) {
  var result = [];
  $.each(list, function(i, e) {
    if ($.inArray(e, result) == -1) result.push(e);
  });
  return result;
}
function remove_duplicates(objectsArray) {
    var usedObjects = {};
    for (var i=objectsArray.length - 1;i>=0;i--) {
        var so = JSON.stringify(objectsArray[i]);
        if (usedObjects[so]) {
            objectsArray.splice(i, 1);
        } else {
            usedObjects[so] = true;          
        }
    }
    return objectsArray;
}
function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
