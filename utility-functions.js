/**
 * ADJUST WEIGHTS
 * used to adjust weights based on the proposed algorithm
 * propogates the weights to maintain 5 principles:
 * P1. If a node has a weight of at least  it should be displayed.
 * P2. If a non-process node has an initial weight of at least , 
 * all the processes it is involved with should be displayed.
 * P3. If a process is to be displayed, then all its inputs (substrates), 
 * outputs (products), and effectors should be displayed too.
 * P4. If a node has an initial weight of at least , the parent node 
 * (complex or compartment) should be shown. In other words a parent node 
 * should be shown if at least one of its children has an initial weight 
 * of at least .
 * P5. A complex molecule should always be shown with all its components.
 * The code has initialization (A0) and  4 steps (A1-A4)
**/
function adjustWeights(w, vis)
{
	var weights = w;
	var parents = new Array();
	var pId = new Array();
	var processes = new Array();
	var leaves = new Array();
	
	var nodes = vis.nodes();

	// A0: initialization
	for (var i = 0; i < nodes.length; i++)
	{
		var glyph = nodes[i].data.glyph_class;

		// make a list of processes for latter update of weights
		if (glyph == "process")
		{
			processes.push(nodes[i]);
		}
		// initialize the parent ID
		pId[nodes[i].data.id] = -1;		
	}
	
	// update parents array
	var k = 0;
	for (var i = 0; i < nodes.length; i++)
	{
		if (vis.childNodes(nodes[i].data.id).length > 0)
		{
			var children = vis.childNodes(nodes[i].data.id);
			for (var j = 0; j < children.length; j++)
			{
				pId[children[j].data.id] = k;
				
			}
			parents[k] = nodes[i].data.id;
			k++;
		}
		else // its a leave, update leaves array
		{
			leaves.push(nodes[i]);
		}
	}
	
	// A1: update process weights based on neighbors
	// for each process, set the initial weight the maximum of its neighbors
	for (var i = 0; i < processes.length; i++)
	{
		var max = 0;
		var neighbors = vis.firstNeighbors([processes[i]]).neighbors;
		for(var j = 0; j < neighbors.length; j++)
		{
			var nID = neighbors[j].data.id;
			if (weights[nID] > max)
			{
				max = weights[nID];
			}
		}
		if (weights[processes[i].data.id] < max)
		{
			weights[processes[i].data.id] = max;
		}
	}
	
	// A2: update all neighbors of processes to have the weight of the process
	for (var i = 0; i < processes.length; i++)
	{
		var w = weights[processes[i].data.id] ;
		var neighbors = vis.firstNeighbors([processes[i]]).neighbors;
		var complexNeighbors = new Array();
		for(var j = 0; j < neighbors.length; j++)
		{
			if (weights[neighbors[j].data.id]  < w)
			{
				weights[neighbors[j].data.id] = w;
			}
		}
	}

	// A3: propogate max values to parents from leaves to root
	for (var i = 0; i < leaves.length; i++)
	{
		var nodeID = leaves[i].data.id;
		var pCheck = pId[nodeID];
		while (pCheck > -1)
		{
			var parentID = parents[pCheck];
			if (weights[parentID] < weights[nodeID])
			{
				weights[parentID] = weights[nodeID];
			}
			pCheck = pId[parentID];
			nodeID = parentID;
		}
	}
	
	// make sure all complex nodes 
	// A4: propogate max values of complex hierarchies down to leaves
	var topComplexParents = new Array();
	var complexParents = new Array();
	var parentNodes = vis.parentNodes();
	for (var i = 0; i < parentNodes.length; i++)
	{
		if (parentNodes[i].data.glyph_class == "complex")
		{
			var parentID = pId[parentNodes[i].data.id];
			if (parentID == -1 || 
			    vis.node(parents[parentID]).data.glyph_class != "complex")
			topComplexParents.push(parentNodes[i]);
			
		}
	}

	while (topComplexParents.length > 0) 
	{
		var nextGeneration = new Array();
		for(var i = 0; i < topComplexParents.length; i++)
		{
			var n = topComplexParents[i];
			if (vis.childNodes(n.data.id).length > 0)
			{ // strange situation
				var children = vis.childNodes(n.data.id);
				for(var j = 0; j < children.length; j++)
				{
					weights[children[j].data.id] = weights[n.data.id];
					if (children[j].data.glyph_class == "complex")
					{
						nextGeneration.push(children[j]);
					}
				}
			}
			
		}
		if (nextGeneration.length > 0)
		{
			topComplexParents = nextGeneration.slice(0);
		}
		else
		{
			break;
		}
	}
	return weights;
};

function deleteSelected(vis)
{
  var selectedNodes = vis.selected("nodes");
  var selectedEdges = vis.selected("edges");
  
  for (var i = 0; i < selectedNodes.length; i++) 
  { 
    vis.removeNode(selectedNodes[i]);
  } 
  
  for (var i = 0; i < selectedEdges.length; i++) 
  { 
    vis.removeEdge(selectedEdges[i]);
  } 
}

function applyHighlight(neighbors, edges, vis)
{
        var bypass = vis.visualStyleBypass() || {};

        if( ! bypass.nodes )
        {
            bypass.nodes = {};
        }
        if( ! bypass.edges )
        {
            bypass.edges = {};
        }

        var allNodes = vis.nodes();

        $.each(allNodes, function(i, n) {
            if( !bypass.nodes[n.data.id] ){
                bypass.nodes[n.data.id] = {};
            }
            if(n.data.glyph_class == "compartment" ||
                n.data.glyph_class == "complex")
                bypass.nodes[n.data.id].compoundOpacity = 0.25;
            else
                bypass.nodes[n.data.id].opacity = 0.25;

        });

        $.each(neighbors, function(i, n) {
            if( !bypass.nodes[n.data.id] ){
                bypass.nodes[n.data.id] = {};
            }
            if(n.data.glyph_class == "compartment" ||
                n.data.glyph_class == "complex")
                bypass.nodes[n.data.id].compoundOpacity = 1;
            else
                bypass.nodes[n.data.id].opacity = 1;
        });

        var opacity;
        var allEdges = vis.edges();
        allEdges = allEdges.concat(vis.mergedEdges());

        $.each(allEdges, function(i, e) {
            if( !bypass.edges[e.data.id] ){
                bypass.edges[e.data.id] = {};
            }

            opacity = 0.15;

            bypass.edges[e.data.id].opacity = opacity;
            bypass.edges[e.data.id].mergeOpacity = opacity;
        });

        $.each(edges, function(i, e) {
            if( !bypass.edges[e.data.id] ){
                bypass.edges[e.data.id] = {};
            }

            opacity = 0.85;

            bypass.edges[e.data.id].opacity = opacity;
            bypass.edges[e.data.id].mergeOpacity = opacity;
        });

        vis.visualStyleBypass(bypass);
}

/**
 * Highlights the neighbors of the selected nodes.
 *
 * The content of this method is copied from GeneMANIA (genemania.org) sources.
 */
function highlightNeighbors(vis)
{	
    var nodes = vis.selected("nodes");

    if (nodes != null && nodes.length > 0)
    {
        var fn = vis.firstNeighbors(nodes, true);
        var neighbors = fn.neighbors;
        var edges = fn.edges;
        edges = edges.concat(fn.mergedEdges);
        neighbors = neighbors.concat(fn.rootNodes);

        applyHighlight(neighbors, edges, vis);
    }
}

function highlightProcesses(vis)
{
	var allNodes = vis.nodes();
	var selectedNodes = vis.selected("nodes");
	var nodesToHighlight = new Array();
	var edgesToHighlight = new Array();
	var weights = new Array();

	for (var i=0; i < allNodes.length; i++)
	{
		var id = allNodes[i].data.id;
		weights[id] = 0;
	}

	for (var i=0; i < selectedNodes.length; i++)
	{
		var id = selectedNodes[i].data.id;
		weights[id] = 1;
	}

	weights = adjustWeights(weights, vis);

	for (var i=0; i < allNodes.length; i++)
	{
		if(weights[allNodes[i].data.id] == 1 )
			nodesToHighlight.push(allNodes[i]);
	}

	var allEdges = vis.edges();

	for (var i=0; i < allEdges.length; i++)
	{
		var source = allEdges[i].data.source;
		var target = allEdges[i].data.target;
		if(weights[source] == 1 &&
			weights[target] == 1)
		{
			edgesToHighlight.push(allEdges[i]);
		}
	}

	applyHighlight(nodesToHighlight, edgesToHighlight, vis);
};

/**
 * Removes all highlights from the visualization.
 *
 * The content of this method is copied from GeneMANIA (genemania.org) sources.
 */
function removeHighlights(vis)
{
    var bypass = vis.visualStyleBypass();
    bypass.edges = {};

    var nodes = bypass.nodes;

    for (var id in nodes)
    {
    
        var styles = nodes[id];
        delete styles["opacity"];
        delete styles["compoundOpacity"];
        delete styles["mergeOpacity"];
        delete styles["selectionGlowColor"];
        delete styles["compoundSelectionGlowColor"];
    }
    vis.visualStyleBypass(bypass);
    vis.visualStyleBypass(null);
}

function showNodeLegend()
{
 	$("#nodeLegendDialog").removeClass('hidden');
	$( "#nodeLegendDialog" ).dialog({dialogClass: 'dialogs',
										width: 430});
}

function showInteractionLegend()
{
 	$("#interactionLegendDialog").removeClass('hidden');
	$( "#interactionLegendDialog" ).dialog({width: 500, height: 212});
}

function showAboutDialog()
{
 	$("#aboutDialog").removeClass('hidden');
	$( "#aboutDialog" ).dialog({width: 340, height: 375});
}

function showLayoutProperties(currentLayoutOptions)
{
 	$("#layoutPropertiesDialog").removeClass('hidden');
 	updateLayoutProperties(currentLayoutOptions);
	$( "#layoutPropertiesDialog" ).dialog({width: 430, height: 420});
}

function openHowToUse()
{
	var url = "http://www.cs.bilkent.edu.tr/~ivis/sbgnviz-as/SBGNViz.as-1.0.UG.pdf";
	var win=window.open(url, '_blank');
	win.focus();
}

function performLayout(vis, graphLayout)
{
	vis.layout(graphLayout);
}

/**
 * Creates an array containing default option values for the Sbgn-pd
 * layout.
 *
 * @return  an array of default layout options
 */
function defaultOptsArray()
{
    var defaultOpts =
        [ { id: "gravitation",          label: "Gravitation",                       value: -50,     tip: "The gravitational constant. Negative values produce a repulsive force." },
            { id: "centralGravitation", label: "Central gravitation",               value: 50,      tip: "All nodes are assumed to be pulled slightly towards the center of the network by a central gravitational force (gravitational constant) during layout." },
            { id: "centralGrDistance",  label: "Central gravity distance",          value: 50,      tip: "The radius of the region in the center of the drawing, in which central gravitation is not exerted." },
            { id: "compoundCentGra",    label: "Compound central gravitation",      value: 50,      tip: "The central gravitational constant for compound nodes." },
            { id: "compCentGraDist",    label: "Compound central gravity distance", value: 50,      tip: "The central gravitational constant for compound nodes." },
            { id: "edgeTension",        label: "Edge tension",                      value: 50,      tip: "The default spring tension for edges." },
            { id: "restLength",         label: "Edge rest length",                  value: 50,      tip: "The default spring rest length for edges." },
            { id: "smartRestLength",    label: "Smart rest length",                 value: true,   tip: "Whether or not smart calculation of ideal rest length should be performed for inter-graph edges." },
            { id: "layoutQuality",      label: "Layout quality",                    value: "default",tip: "A better quality layout requires more iterations, taking longer." },
            { id: "incremental",        label: "Incremental",                       value: false,   tip: "If true, layout is applied incrementally by taking current positions of nodes into account." },
            { id: "uniformLeaf",        label: "Uniform leaf node size",            value: false,   tip: "If true, leaf (non-compound or simple) node dimensions are assumed to be uniform, resulting in faster layout." },
            { id: "smartDistance",      label: "Smart distance",                    value: true,    tip: "If true, gravitational repulsion forces are calculated only when node pairs are in a certain range, resulting in faster layout at the relatively minimum cost of layout quality." },
            { id: "multiLevelScaling",  label: "Multi level scaling",               value: false,   tip: "If true, multi-level scaling algorithm is applied both to better capture the overall structure of the network and to save time on large networks." } ];

    return defaultOpts;
};


function updateLayoutProperties(layoutOptions)
{	
	for (var i=0; i < (layoutOptions).length; i++)
    {
        if (layoutOptions[i].id == "smartRestLength" || layoutOptions[i].id == "incremental" ||
            layoutOptions[i].id == "uniformLeaf" || layoutOptions[i].id == "smartDistance" ||
            layoutOptions[i].id == "multiLevelScaling")
        {
            if (layoutOptions[i].value == true)
            {
                document.getElementById(layoutOptions[i].id).value = true;
                document.getElementById(layoutOptions[i].id).checked = true;
            }
            else
            {        
                document.getElementById(layoutOptions[i].id).value = false;
                document.getElementById(layoutOptions[i].id).checked = false;
            }
        }
        else
        {
			document.getElementById(layoutOptions[i].id).value = layoutOptions[i].value;
        }
    }
}

function saveProperties(currentLayoutOptions,graphLayout){

    for (var i=0; i < (currentLayoutOptions).length; i++)
    {

        if (currentLayoutOptions[i].id == "smartRestLength" || currentLayoutOptions[i].id == "incremental" ||
            currentLayoutOptions[i].id == "uniformLeaf" || currentLayoutOptions[i].id == "smartDistance" ||
            currentLayoutOptions[i].id == "multiLevelScaling")
        {
            if(document.getElementById(layoutOptions[i].id).checked == true)
            {
                currentLayoutOptions[i].value = true;
                document.getElementById(currentLayoutOptions[i].id).value = true;
            }
            else
            {
                currentLayoutOptions[i].value = false;
                document.getElementById(currentLayoutOptions[i].id).value = false;
            }
        }
        else
        {
            // simply copy the text field value
            currentLayoutOptions[i].value =
                document.getElementById(currentLayoutOptions[i].id).value;
        }
    }
    updateGraphLayout(currentLayoutOptions, graphLayout);
    $("#layoutPropertiesDialog").dialog("close");
    
}

function makeDefaultProperties(currentLayoutOptions,layoutOptions, graphLayout)
{
	//currentLayoutOptions = layoutOptions;
	currentLayoutOptions = clone(layoutOptions);
	updateLayoutProperties(currentLayoutOptions);
	updateGraphLayout(currentLayoutOptions, graphLayout)
}

function updateGraphLayout(layoutOptions, graphLayout)
{
    var options = new Object();

    for (var i=0; i < layoutOptions.length; i++)
    {
        options[layoutOptions[i].id] = layoutOptions[i].value;
    }

    graphLayout.options = options;
}

function clone(obj) {
    if (null == obj || "object" != typeof obj) return obj;

    if (obj instanceof Date) {
        var copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }

    if (obj instanceof Array) {
        var copy = [];
        for (var i = 0, len = obj.length; i < len; i++) {
            copy[i] = clone(obj[i]);
        }
        return copy;
    }

    if (obj instanceof Object) {
        var copy = {};
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
        }
        return copy;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");
}

// Sample menu select function
$(function() { 
   $("#sampleList li").not('.emptyMessage').click(function() {
   		   // Get the name of selected sample here ! 
           var sampleName = this.id;
           var vis = window["vis"];
           var visual_style = window["visual_style"];
           
           $.get("samples/" + sampleName +".xml", function(data) {
                if (typeof data !== "string") {
                        if (window.ActiveXObject) {
                                data = (new XMLSerializer()).serializeToString(data);
                        } else {
                                data = (new XMLSerializer()).serializeToString(data);
                        }
                }
                
                vis.draw({ network: data, layout:"Preset" ,visualStyle: visual_style});
        });
   });
});

/**
 * read text input
 */
function readText(filePath)
{
		var reader= new FileReader();
        var output = ""; //placeholder for text output
        if(filePath.files && filePath.files[0]) 
        {           
            reader.onload = function (e) 
            {
                output = e.target.result;
                vis.draw({ network: output, layout:"Preset" ,visualStyle: visual_style});
            };//end onload()
            reader.readAsText(filePath.files[0]);
        }//end if html5 filelist support
        else if(ActiveXObject && filePath) { //fallback to IE 6-8 support via ActiveX
            try 
            {
                reader = new ActiveXObject("Scripting.FileSystemObject");
                var file = reader.OpenTextFile(filePath, 1); //ActiveX File Object
                output = file.ReadAll(); //text contents of file
                file.Close(); //close file "input stream"
                vis.draw({ network: output, layout:"Preset" ,visualStyle: visual_style});
            } 
            catch (e) 
            {
                if (e.number == -2146827859) 
                {
                    alert('Unable to access local files due to browser security settings. ' + 
                     'To overcome this, go to Tools->Internet Options->Security->Custom Level. ' + 
                     'Find the setting for "Initialize and script ActiveX controls not marked as safe" and change it to "Enable" or "Prompt"'); 
                }
            }       
        }
        else 
        { 
        //this is where you could fallback to Java Applet, Flash or similar
            return false;
        }       
        return true;
}   


/**
 * save graph
 */
function saveFunction(fileExtension)
{
    if(fileExtension == 'sbgnml')
		vis.exportNetwork('sbgnml', 'export.jsp?type=sbgnml');
	else 
		vis.exportNetwork('png', 'export.jsp?type=png');
}

