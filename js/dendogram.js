/**
 * inspiration from
 * http://bl.ocks.org/mbostock/4339083
 * https://gist.github.com/kueda/1036776
 */

dendroGram = function module() {

  var cluster = d3.layout.cluster()
    .children(function (d) {
      return d.branchset;
    })
    .value(function (d) {
      return d.length;
    })
    .sort(function comparator(a, b) {
      return +a.name - +b.name;
    })
    .separation(function (a, b) {
      return (a.parent == b.parent ? 1 : 1);
    });

  var margin = {
      top: 30,
      right: 20,
      bottom: 30,
      left: 20
    },
    width = 700 - margin.left - margin.right,
    height = 800 - margin.top - margin.bottom,
    barHeight = 50,
    barWidth = width * .8;

  var i = 0,
    duration = 1000,
    root, svg, svgGroup, height, defs, gradient, glowFilter, addTree = [];

  // This makes the layout more consistent.
  var levelWidth = [1];

  // Calculate total nodes, max label length
  var totalNodes = 0;
  var nodeEnter;
  var maxLabelLength = 0;

  // panning variables
  var panSpeed = 200;
  var panBoundary = 20; // Within 20px from edges will pan when dragging.
  // Misc. variables
  var i = 0;
  var color = d3.scale.category20();

  var options = {
    gradient: false,
    glow: false,
  }

  // define the zoomListener which calls the zoom function on the "zoom" event constrained within the scaleExtents
  var zoomListener = d3.behavior.zoom().scaleExtent([0.1, 3]).on("zoom", zoom);

  function exports(_selection) {
    _selection.each(function (_data) {

      //root = parseNewick(_data[]);

      svg = d3.select(this)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      //glow filer to create density diagram
      //Container for the gradients
      defs = svg.append("defs");

      gradient();
      glowFilter();
      multiNexusTree(_data)

    }) //end of selections
  } //end of exports

  function multiNexusTree(tree_data) {

    childCount(0, parseNewick(tree_data[3]));

    var newHeight = d3.max(levelWidth) * 50; // 25 pixels per line
    cluster = cluster.size([newHeight, width - 350]);

    for (var i = 100; i < 1000; i++) {
      var parseTree = parseNewick(tree_data[i])
      //console.log(parseTree)
      updateTree(parseTree);
    }
    console.log("Total Generation : " + tree_data.length)
  }

  function updateTree(data) {

    nodes = cluster.nodes(data);
    links = cluster.links(nodes);

    // Update the links…
    link = svg.append("g")
      .attr("class", "links")
      .selectAll("path")
      .data(links)
      .enter().append("path")
      //.transition()
      //.duration(duration)
      .each(function (d) {
        d.target.linkNode = this;
      })
      .attr("d", function (d) {
        //return stepLinear(d.source.x, d.source.y, d.target.x, d.target.y)
        return diagonal(d.source.x, d.source.y, d.target.x, d.target.y)
      })
      .style("fill", "none")
      .style("stroke", function (d) {
        return color(d)
      })
      .style("stroke-linecap", "round")
      .style("opacity", "1")
      .style("filter", "url(#glow)")
      //.style("stroke", "url(#svgGradient)")
      .style("stroke-width", function (d) {
        return 2;
      });


    node = svg.selectAll(".node")
      .data(nodes)
      .enter().append("g")
      .attr("class", function (d) {
        if (d.children) {
          if (d.depth == 0) {
            return "root-node";
          } else {
            return "inner-node";
          }
        } else {
          return "leaf-node";
        }
      })
      .attr("transform", function (d) {
        return "translate(" + d.y + "," + d.x + ")";
      })

    //Adding text to node 
    node.selectAll('.leaf-node')
      .append("text")
      .attr("dx", function (d) {
        return d.children ? -5 : 4;
      })
      .attr("dy", function (d) {
        return 8;
      })
      .attr("text-anchor", function (d) {
        return d.children ? "end" : "start";
      })
      .style("font-size", "7px")
      .style("fill", "#000")
      .text(function (d) {
        if (d.children) {
          return d.name;
        }
      })

  } //end of update

  d3.select("#save-button").on("click", exportAsImage);

  function zoom() {
    svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
  }

  function diagonal(sourceX, sourceY, targetX, targetY) {
    return ("M" + sourceY + "," + sourceX + "L" + targetY + ", " + targetX);
  };

  // Like d3.svg.diagonal but with square corners
  function stepLinear(sourceX, sourceY, targetX, targetY) {
    return "M" + sourceY + ',' + sourceX +
      "V" + targetX + "H" + targetY;
  } // end of stepLinear	

  // Compute the new height, function counts total children of root node and sets tree height accordingly.
  // This prevents the layout looking squashed when new nodes are made visible or looking sparse when nodes are removed
  var childCount = function (level, n) {

    if (n.branchset && n.branchset.length > 0) {
      if (levelWidth.length <= level + 1) levelWidth.push(0);

      levelWidth[level + 1] += n.branchset.length;
      n.branchset.forEach(function (d) {
        childCount(level + 1, d);
      });
    }
  };

  // Compute the maximum cumulative length of any node in the tree.
  function maxLength(d) {
    return d.length + (d.children ? d3.max(d.children, maxLength) : 0);
  }

  function zoom() {
    svgGroup.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
  }

  function glowFilter() {
    //Filter for the outside glow
    glowFilter = defs.append("filter")
      .attr("id", "glow");

    glowFilter.append("feGaussianBlur")
      .attr("stdDeviation", "1")
      .attr("result", "coloredBlur");

    var feMerge = glowFilter.append("feMerge");
    feMerge.append("feMergeNode")
      .attr("in", "coloredBlur");
    feMerge.append("feMergeNode")
      .attr("in", "SourceGraphic");

  } //end of glow filter

  function gradient() {
    //Needed to map the values of the dataset to the color scale

    gradient = defs.append("linearGradient")
      .attr("id", "svgGradient")
      .attr("x1", "0%")
      .attr("x2", "100%")
      .attr("y1", "0%")
      .attr("y2", "100%");

    gradient.append("stop")
      .attr('class', 'start')
      .attr("offset", "0%")
      .attr("stop-color", "#f9d057")
      .attr("stop-opacity", 1);

    gradient.append("stop")
      .attr('class', 'end')
      .attr("offset", "100%")
      .attr("stop-color", "#d7191c")
      .attr("stop-opacity", 1);

  } //end of gradient

  // Function to parse tree data to object
  function parseNewick(a) {
    for (var e = [], r = {}, s = a.split(/\s*(;|\(|\)|,|:)\s*/), t = 0; t < s.length; t++) {
      var n = s[t];
      switch (n) {
        case "(":
          var c = {};
          r.branchset = [c], e.push(r), r = c;
          break;
        case ",":
          var c = {};
          e[e.length - 1].branchset.push(c), r = c;
          break;
        case ")":
          r = e.pop();
          break;
        case ":":
          break;
        default:
          var h = s[t - 1];
          ")" == h || "(" == h || "," == h ? r.name = n : ":" == h && (r.length = parseFloat(n))
      }
    }
    return r;
  }

  //Saving the svg element as png on save button 
  function exportAsImage() {

    var svg = document.querySelector('svg');

    var svgData = new XMLSerializer().serializeToString(svg);

    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");

    canvas.height = height;
    canvas.width = width;
    var dataUri = '';
    dataUri = 'data:image/svg+xml;base64,' + btoa(svgData);

    var img = document.createElement("img");

    img.onload = function () {
      ctx.drawImage(img, 0, 0);

      // Initiate a download of the image
      var a = document.createElement("a");

      a.download = "density_tree" + ".png";
      a.href = canvas.toDataURL("image/png");
      document.querySelector("body").appendChild(a);
      a.click();
      document.querySelector("body").removeChild(a);

    };

    img.src = dataUri;
  }


  //export function to modules
  exports.width = function (_) {
    if (!arguments.length) return width;
    width = _;
    return exports;
  }

  exports.height = function (_) {
    if (!arguments.length) return height;
    height = _;
    return exports;
  }

  exports.addTree = function (_) {
    if (!arguments.length) return addTree;
    addTree.push(_);
    return this;
  }
  //d3.rebind(exports, dispatch, "on");
  return exports;

} //end of module
