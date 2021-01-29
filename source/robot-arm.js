// Based on https://webglfundamentals.org/webgl/lessons/webgl-3d-orthographic.html
// They're nice colors
var colorList = [
  200, 70, 120,  //  0 kinda reddish-pinkish tint
  80, 70, 200,   //  3 nice soft indigo looking color
  70, 200, 210,  //  6 like a duller cyan
  200, 200, 70,  //  9 dim yellow
  210, 100, 70,  // 12 color of red-brown clay
  210, 160, 70,  // 15 kinda beige-y orange color
  70, 180, 210,  // 18 sky blue but darker
  100, 70, 210,  // 21 like the second color but more purple
  76, 210, 100,  // 24 soft green
  140, 210, 80,  // 27 soft lime-green
  90, 130, 110,  // 30 very dark turquoise
  160, 160, 220, // 33 like the clay in minecraft but blue
];

// corners for the rectangle
var rectCorners;

// Light sources
//  note to self: if the light directions are wonked out, 
//                check your surface normal calculations
//  directional light, currently unused
var lightVector = [1, 0.7, 0.5];
//  point light position in the world
var pointLightPosition = [20,-10,100];

// variable for the 'shininess' of the models
var shininess = 7;

// Parameters -----------------------------------------------------
// ----------------------------------------------------------------
  // base values and radius multipliers
var baseRadius = 50;  // "pixel" scale, converts to -1->1 in shader
var baseHeight = 50;  //    height will actually be baseHeight*2
var TopRadius = 1;    // Multipliers for radius
var BotRadius = 1.3;  

// base values for rectangles and length multipliers
var baseLength = 30;
var lowerRectWidth  = 1;
var lowerRectHeight = 5;
var upperRectWidth  = 1;
var upperRectHeight = 5;

// main matrix
var matrix = m4.identity();
// Cylinder transforms
var cylMatrix = m4.identity();
// lowerRect transforms
var lowerMatrix = m4.identity();
// upperRect transforms
var upperMatrix = m4.identity();

// parameters for transformation
var xAngleInDegrees = 0; //160;
var yAngleInDegrees = 0; //54;
var zAngleInDegrees = 0; //-12;

var translation = [0, 0, 0];
var rotation = [
  xAngleInDegrees * Math.PI / 180,
  yAngleInDegrees * Math.PI / 180, 
  zAngleInDegrees * Math.PI / 180,
];
var scale = [1,1,1];

// Set up the camera matrix
  //    Distance we want from our point
  var camRadius = 600;

  //    Camera angle we want around our point
  var xCameraAngleDegrees = 0;
  var yCameraAngleDegrees = 0;
  var zCameraAngleDegrees = 0;

  var cameraAngleRadians = [
    xCameraAngleDegrees * Math.PI / 180,
    yCameraAngleDegrees * Math.PI / 180, 
    zCameraAngleDegrees * Math.PI / 180,
  ];

  var xCameraOffset = 0;
  var yCameraOffset = 300;
  var zCameraOffset = 0;
// ----------------------------------------------------------------
// ----------------------------------------------------------------

var rotatingModel = true;
var topAngle = false;
var reset = false;

// Run main() as soon as our window loads
window.onload = main;
function main() {
  var canvas = document.querySelector("#c");
  var gl = canvas.getContext("webgl");
  if(!gl){
    // no webgl for you!
    alert("Unable to initialize WebGL. Your browser or machine may not support it.");
    return;
  }
  
  var vertexShaderSource = document.querySelector("#vertex-shader-3d-matrix").text;
  var fragmentShaderSource = document.querySelector("#fragment-shader").text;

  var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

  var program = createProgram(gl, vertexShader, fragmentShader);

  // initialize our shader attribs and uniforms, initalize the viewing matrix
  var programInfo = programInfoInit(gl, program);

  // Define and obtain our data
  var CylinderData = getCylinderData(3);
  defineRectangleData();
  var lowerRectangleData = getRectangleData(0);
  var upperRectangleData = getRectangleData(15);
  bufferInit(gl, programInfo, CylinderData, lowerRectangleData, upperRectangleData);

  // Set the light direction / position
  gl.uniform3fv(programInfo.uniforms.lightWorldPosition, pointLightPosition);
  

  // Set button functions
  var rotatonButton = document.querySelector("#rotationButton").onclick 
    = function() { 
      rotatingModel = !rotatingModel; 
      reset = true;
    };

  var topButton = document.querySelector("#topAngle").onclick 
    = function() { topAngle = true; };

  var sideButton = document.querySelector("#sideAngle").onclick 
    = function() { topAngle = false; };

  var resetButton = document.querySelector("#reset").onclick 
    = function() { reset = true; };


  var then = 0;
  var deltaTime;
  function render(now) {
    
    // take current time, convert to seconds
    now *= 0.001;
    deltaTime = now - then;

    if(reset) {
      yCameraAngleDegrees = 0;
      yCameraOffset = 200;
      zCameraOffset = 0;
      reset = false;
    }

    if(rotatingModel) {
      then = now;
      //console.log("end me");
      yCameraAngleDegrees = (yCameraAngleDegrees + (30 * deltaTime)) % 360;
      //console.log(cameraAngleRadians[1]);
    }

    if(topAngle) {
      //xCameraAngleDegrees = -90;
      yCameraOffset = 1000;
      zCameraOffset = -800;
    } else {
      //xCameraAngleDegrees = 0;
      yCameraOffset = 200;
      zCameraOffset = 0;
    }

    cameraAngleRadians = [
      xCameraAngleDegrees * Math.PI / 180,
      yCameraAngleDegrees * Math.PI / 180, 
      zCameraAngleDegrees * Math.PI / 180,
    ];

    // Resize before anything, otherwise it looks wonky
    resize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.7, 0.7, 0.7, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    matrix = m4.identity();
    lowerMatrix = m4.identity();
    upperMatrix = m4.identity();

    // initialize our camera
    var worldViewProjectMatrix = viewingInit(gl);
    matrix = m4.multiply(matrix, worldViewProjectMatrix);

    // Draw the cylinder
    drawCylinder(gl, CylinderData);
    drawCylinderTop(gl, CylinderData);
    drawCylinderBot(gl, CylinderData);

    // Transform and draw the lower arm
    lowerMatrix = m4.translate(lowerMatrix, 0, baseHeight, 0);
    lowerMatrix = m4.yRotate(lowerMatrix, 0);
    lowerMatrix = m4.zRotate(lowerMatrix, 0.4);
    lowerMatrix = m4.translate(lowerMatrix, 0, (baseLength*lowerRectHeight), 0);

    matrix = m4.multiply(matrix, lowerMatrix);
    drawLowerRect(gl, CylinderData, lowerRectangleData);

    // Transform and draw the upper arm
    upperMatrix = m4.translate(upperMatrix, 0, (baseLength*(lowerRectHeight+upperRectHeight))/2, 0);
    upperMatrix = m4.zRotate(upperMatrix, 1.9);
    upperMatrix = m4.translate(upperMatrix, 0, (baseLength*upperRectHeight), 0);
    upperMatrix = m4.scale(upperMatrix, 1, 1, 0.99);

    matrix = m4.multiply(matrix, upperMatrix);
    drawUpperRect(gl, CylinderData, lowerRectangleData);

    requestAnimationFrame(render);
  }
  
  requestAnimationFrame(render);

  //console.log("This... is the end.");
}

function drawCylinder(gl, CylinderData) {
  // transform, projection was already done in programInfoInit
  //var thisMatrix = m4.identity();
  gl.uniformMatrix4fv(programInfo.uniforms.worldViewProjection, false, matrix);

  // Side of cylinder
  var primitiveType = gl.TRIANGLES;
  // first drawing: no offset
  var offset = 0; 
  var count = CylinderData.sideLength;
  gl.drawArrays(primitiveType, offset, count);
}

function drawCylinderTop(gl, CylinderData) {
  gl.uniformMatrix4fv(programInfo.uniforms.worldViewProjection, false, matrix);

  var primitiveType = gl.TRIANGLE_FAN;
  var offset = CylinderData.sideLength;
  var count = CylinderData.baseLength;
  gl.drawArrays(primitiveType, offset, count);
}

function drawCylinderBot(gl, CylinderData) {
  gl.uniformMatrix4fv(programInfo.uniforms.worldViewProjection, false, matrix);

  var primitiveType = gl.TRIANGLE_FAN;
  // second drawing: offset = length of previous drawing done -> CylinderData.sideLength
  var offset = CylinderData.sideLength + CylinderData.baseLength;
  var count = CylinderData.baseLength; 
  gl.drawArrays(primitiveType, offset, count);
}

function drawLowerRect(gl, CylinderData, RectangleData) {
  // Do transformations
  var thisMatrix = matrix;
  
  //matrix = m4.translate(matrix, 0, 25 * lowerRectHeight, 0);
  //matrix = m4.scale(matrix, lowerRectWidth, lowerRectHeight, lowerRectWidth);
  var scale = m4.scaling(1, lowerRectHeight, 1);
  var transl = m4.translation(0, 0, 0);
  var instance = m4.multiply(transl, scale);
  thisMatrix = m4.multiply(matrix, instance);
  

  gl.uniformMatrix4fv(programInfo.uniforms.worldViewProjection, false, thisMatrix);
  var primitiveType = gl.TRIANGLES;
  // third drawing: offset = Cyl.sideLength + Cyl.baseLength == Cyl.fullLength
  var offset = CylinderData.fullLength;
  var count = RectangleData.rectLength;
  gl.drawArrays(primitiveType, offset, count);
}

function drawUpperRect(gl, CylinderData, RectangleData) {
  // Do transformations
  var thisMatrix = matrix;
  
  //matrix = m4.translate(matrix, 200, 0, 0);
  //matrix = m4.scale(matrix, 1, upperRectHeight, 1);
  var scale = m4.scaling(1, upperRectHeight, 1);
  var transl = m4.translation(0, 0, 0);
  var instance = m4.multiply(transl, scale);
  thisMatrix = m4.multiply(matrix, instance);
  

  gl.uniformMatrix4fv(programInfo.uniforms.worldViewProjection, false, thisMatrix);
  var primitiveType = gl.TRIANGLES;
  var offset = CylinderData.fullLength + RectangleData.rectLength;
  var count = RectangleData.rectLength;
  gl.drawArrays(primitiveType, offset, count);

}

// Initialize buffers with the data from the Cylinder and Rectangle
function bufferInit(gl, programInfo, CylinderData, lowerRectangleData, upperRectangleData) {
  resize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  //gl.useProgram(programInfo.program);

  var allPoints  = (CylinderData.points).concat(lowerRectangleData.points);
      allPoints  = allPoints.concat(upperRectangleData.points);
  var allColors  = (CylinderData.colors).concat(lowerRectangleData.colors);
      allColors  = allColors.concat(upperRectangleData.colors);
  var allNormals = (CylinderData.normals).concat(lowerRectangleData.normals);
      allNormals = allNormals.concat(upperRectangleData.normals);

  // Point buffer
    var pointsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pointsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(allPoints), gl.STATIC_DRAW);

    // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    var psize = 3;         // 3 components per iteration (xyz), w defaults to 1 in shader
    var ptype = gl.FLOAT;   // the data is 32bit floats
    var pnormalize = false; // don't normalize the data
    var pstride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var poffset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(programInfo.attributes.position, psize, ptype, pnormalize, pstride, poffset);
    gl.enableVertexAttribArray(programInfo.attributes.position);
    
  // Color buffer
    var colorsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(allColors), gl.STATIC_DRAW);
    
    // Tell the attribute how to get data out of colorBuffer (ARRAY_BUFFER)
    var csize = 3;                // 3 components per iteration (rgb), a defaults to 1 in shader
    var ctype = gl.UNSIGNED_BYTE;  // the data is 8bit unsigned values
    var cnormalize = true;         // normalize the data (convert from 0-255 to 0-1)
    var cstride = 0;
    var coffset = 0;
    gl.vertexAttribPointer(programInfo.attributes.color, csize, ctype, cnormalize, cstride, coffset);
    gl.enableVertexAttribArray(programInfo.attributes.color);
  
  // Normal buffer
    var normalsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(allNormals), gl.STATIC_DRAW);
    
    // Tell the attribute how to get data out of normalBuffer (ARRAY_BUFFER)
    var nsize = 3;
    var ntype = gl.FLOAT;
    var nnormalize = false;
    var nstride = 0;
    var noffset = 0;
    gl.vertexAttribPointer(programInfo.attributes.normal, nsize, ntype, nnormalize, nstride, noffset);
    gl.enableVertexAttribArray(programInfo.attributes.normal);
  
}

// initialize our perspective matrix
function viewingInit(gl) {
  // Set up an orthographic projection matrix (parallel lines are always parallel)
  var left = 0;
  var right = gl.canvas.clientWidth;
  var bottom = gl.canvas.clientHeight;
  var top = 0;
  var near = 2000;
  var far = -2000;
  //var projectionMatrix = m4.orthographic(left, right, bottom, top, near, far);

  // Set up a perspective projection matrix (parallel lines meet at infinity)
  var fieldOfViewDegrees = 60;
  var fieldOfViewRadians = fieldOfViewDegrees * Math.PI / 180;
  var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  var zNear = 1;
  var zFar = 2000;
  var projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);
  
  // Set up the camera matrix
  //    Create the cameraMatrix
  var cameraMatrix = m4.identity();
  cameraMatrix = m4.xRotate(cameraMatrix, cameraAngleRadians[0]);
  cameraMatrix = m4.yRotate(cameraMatrix, cameraAngleRadians[1]);
  cameraMatrix = m4.zRotate(cameraMatrix, cameraAngleRadians[2]);
  cameraMatrix = m4.translate(cameraMatrix, xCameraOffset, yCameraOffset, zCameraOffset + camRadius * 1.5);

  // Set up for the lookAt miatrix
  //    get camera's position from the matrix
  var cameraPosition = [
    cameraMatrix[12],
    cameraMatrix[13],
    cameraMatrix[14],
  ];
  //    get the vector for 'up' for computing normals
  var up = [0, 1, 0];

  //  Pick some place to lookAt
  var target = [0, 250, 0];
  //    Compute the camera's matrix to lookAt point
  var lookAtMatrix = m4.lookAt(cameraPosition, target, up);

  //  Set up the view matrix, 'moves' the camera to the origin
  //var viewMatrix = m4.inverse(cameraMatrix);
  var viewMatrix = m4.inverse(lookAtMatrix);

  // view projection matrix
  var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);
  // Compute the world matrix
  var worldMatrix = m4.identity();
  var worldInverseMatrix = m4.inverse(worldMatrix);
  var worldInverseTransposeMatrix = m4.transpose(worldInverseMatrix);
  // worldViewProjectMatrix
  var worldViewProjectMatrix = m4.multiply(viewProjectionMatrix, worldInverseTransposeMatrix);

  //  Put it into our main matrix
  //matrix = m4.multiply(matrix, viewProjectionMatrix);
  //matrix = m4.multiply(matrix, worldViewProjectMatrix);

  // Set the uniforms in the shaders
  gl.uniformMatrix4fv(programInfo.uniforms.worldViewProjection, false, worldViewProjectMatrix);
  gl.uniformMatrix4fv(programInfo.uniforms.worldInverseTranspose, 
    false, 
    worldInverseTransposeMatrix);
  gl.uniformMatrix4fv(programInfo.uniforms.world, false, worldMatrix);
  // set the camera/view position
  gl.uniform3fv(programInfo.uniforms.viewWorldPosition, cameraPosition);

  //var v = m4.transformPoint(worldMatrix, [20, 30, 50]);
  //gl.uniform3fv(programInfo.uniforms.lightWorldPosition, v);

  return worldViewProjectMatrix;
}

// Initialize variables in the shader
function programInfoInit(gl, shaderProgram) {
  
  gl.useProgram(shaderProgram);

  programInfo = {
    program: shaderProgram,
    attributes: {
      position: gl.getAttribLocation(shaderProgram, 'a_position'),
      color: gl.getAttribLocation(shaderProgram, 'a_color'),
      normal: gl.getAttribLocation(shaderProgram, 'a_normal'),
    } ,
    uniforms: {
      resolution: gl.getUniformLocation(shaderProgram, "u_resolution"),
      shininess: gl.getUniformLocation(shaderProgram, 'u_shininess'),

      world: gl.getUniformLocation(shaderProgram, 'u_world'),
      worldViewProjection: gl.getUniformLocation(shaderProgram, 'u_worldViewProjection'),
      worldInverseTranspose: gl.getUniformLocation(shaderProgram, 'u_worldInverseTranspose'),

      lightWorldPosition: gl.getUniformLocation(shaderProgram, 'u_lightWorldPosition'),
      viewWorldPosition: gl.getUniformLocation(shaderProgram, 'u_viewWorldPosition'),

      lowerMatrix: gl.getUniformLocation(shaderProgram, 'u_lowerMatrix'),
      upperMatrix: gl.getUniformLocation(shaderProgram, 'u_upperMatrix'),
       
      //reverseLightDirection: gl.getUniformLocation(shaderProgram, 'u_reverseLightDirection'),
    },
  };

  // set the light direction
  gl.uniform2f(programInfo.uniforms.resolution, gl.canvas.width, gl.canvas.height);
  //gl.uniform3fv(programInfo.uniforms.reverseLightDirection, m4.normalize(lightVector));
  gl.uniform3fv(programInfo.uniforms.lightWorldPosition, pointLightPosition);
  gl.uniform1f(programInfo.uniforms.shininess, shininess);

  return programInfo;
}


// Useful resource:
//    https://cse.taylor.edu/~jdenning/classes/cos350/slides/08_Cylinders.html
// get our cylinder data with color index 'c' for colorList
function getCylinderData(c) {
  // indices for colorList
  var mod = colorList.length;
  var j1, j2, j3;
  j1 = c;
  j2 = j1 + 1;
  j3 = j2 + 1;

  // Number of divisions for the circumference of the cylinder
  var NumSides = 72;
  // coords for the top and bot faces of the cylinder
  var x1, z1;
  var x2, z2;
  var y;
  // Increments of the angle based on NumSides
  var angle = 0;
  var inc = Math.PI * 2.0 / NumSides;

  //var points = new Array(NumSides * 6);
  //var colors = new Array(NumSides * 6);
  var topPoints  = [];
  var topColors  = [];
  var topNormals = [];

  var botPoints  = [];
  var botColors  = [];
  var botNormals = [];

  var points  = [];
  var colors  = [];
  var normals = [];

  // Currently calculated normal in the forloop
  var currNormal;
  // Normals for the bottom and top of the cylinder
  var up   = [0,  1, 0];
  var down = [0, -1, 0];

  // coords for the center points of the bases
  x = 0;
  y = baseHeight;
  z = 0;

  // top base center point
  topPoints.push(x,y,z);
  topColors.push(colorList[j1], colorList[j2], colorList[j3]);
  topNormals.push(up[0], up[1], up[2]);

  // bot base center point
  botPoints.push(x,-y,z);
  botColors.push(colorList[j1], colorList[j2], colorList[j3]);
  botNormals.push(down[0], down[1], down[2]);

  // For each 'cut' of the side, add its point and color data
  for(var i=0; i < NumSides; ++i) {
    // indices for colorList
    //j1 = i   % mod;
    //j2 = i+1 % mod;
    //j3 = i+2 % mod;

    // x,z coords for the left half of a side
    x1 = baseRadius * Math.cos(angle);
    z1 = baseRadius * Math.sin(angle);
    // x,z coords for the right half of a side
    angle += inc;
    x2 = baseRadius * Math.cos(angle);
    z2 = baseRadius * Math.sin(angle);

    y = baseHeight;  // For now, arbitrary; change it to something later

    // Side vertices -----------------------------------------#
      // First triangle
        // top left vertex
      points.push(x1 * TopRadius, y, z1* TopRadius);
      colors.push(colorList[j1], colorList[j2], colorList[j3]);
        // top right vertex
      points.push(x2* TopRadius,  y, z2* TopRadius);
      colors.push(colorList[j1], colorList[j2], colorList[j3]);
        // bot left vertex
      points.push(x1* BotRadius, -y, z1* BotRadius);
      colors.push(colorList[j1], colorList[j2], colorList[j3]);
      
        // Compute normals for this slice
        //  cross(top left, top right)
      currNormal = m4.cross([x1 * TopRadius, y, z1* TopRadius], 
        [x2* TopRadius,  y, z2* TopRadius]);
      normals.push(currNormal[0], currNormal[1], currNormal[2]);
      normals.push(currNormal[0], currNormal[1], currNormal[2]);
      normals.push(currNormal[0], currNormal[1], currNormal[2]);
      
      // Second triangle
        // top right vertex
      points.push(x2* TopRadius,  y, z2* TopRadius);
      colors.push(colorList[j1], colorList[j2], colorList[j3]);
        // bot right vertex
      points.push(x2* BotRadius, -y, z2* BotRadius);
      colors.push(colorList[j1], colorList[j2], colorList[j3]);
        // bot left vertex
      points.push(x1* BotRadius, -y, z1* BotRadius);
      colors.push(colorList[j1], colorList[j2], colorList[j3]);
      
        // Compute normals
      //currNormal = m4.cross([x2* TopRadius,  y, z2* TopRadius], 
      //  [x1* BotRadius, -y, z1* BotRadius]);
      normals.push(currNormal[0], currNormal[1], currNormal[2]);
      normals.push(currNormal[0], currNormal[1], currNormal[2]);
      normals.push(currNormal[0], currNormal[1], currNormal[2]);
      

    // Top base vertex ---------------------------------------#
      // top left vertex
    topPoints.push(z1 * TopRadius, y, x1 * TopRadius);
    topColors.push(colorList[j1], colorList[j2], colorList[j3]);
    topNormals.push(up[0], up[1], up[2]);

    // Bot base vertex ---------------------------------------#
      // bot left vertex
    botPoints.push(x1 * BotRadius, -y, z1 * BotRadius);
    botColors.push(colorList[j1], colorList[j2], colorList[j3]);
    botNormals.push(down[0], down[1], down[2]);
  }

  // Define final vertices coords
  angle += inc;
  x1 = baseRadius * Math.cos(angle);
  z1 = baseRadius * Math.sin(angle);
  // Final vertex for top base
  topPoints.push(z1 * TopRadius, y, x1 * TopRadius);
  topColors.push(colorList[j1], colorList[j2], colorList[j3]);
  topNormals.push(up[0], up[1], up[2]);
  // Final vertex for bot base
  botPoints.push(x1 * BotRadius, -y, z1 * BotRadius);
  botColors.push(colorList[j1], colorList[j2], colorList[j3]);
  botNormals.push(down[0], down[1], down[2]);

  // Put all the data together
  var CylinderData = {
    points,
    colors,
    normals,
    sideLength: points.length / 3,
    baseLength: topPoints.length / 3,
    fullLength: 0,
  }

  points = points.concat(topPoints);
  points = points.concat(botPoints);
  colors = colors.concat(topColors);
  colors = colors.concat(botColors);
  normals = normals.concat(topNormals);
  normals = normals.concat(botNormals);

  CylinderData.points  = points;
  CylinderData.colors  = colors;
  CylinderData.normals = normals;
  CylinderData.fullLength = points.length / 3;

  return CylinderData;
}

// Create our rectangle data from baseLength defined at the top
function defineRectangleData() {
  // baseLength defined above, usually == 100
  var len = baseLength;
  // Corner vertices on a rectangle
  rectCorners = [
    // if we're facing the -z direction:
    //  the front face
    [-len,  len,  len],  // 0 top left
    [-len, -len,  len],  // 1 bot left
    [ len,  len,  len],  // 2 top right
    [ len, -len,  len],  // 3 bot right

    //  the back face
    [ len,  len, -len],  // 4 top right
    [ len, -len, -len],  // 5 bot right
    [-len,  len, -len],  // 6 top left
    [-len, -len, -len],  // 7 bot left
  ];
}

// get our rectangle data with color index 'c' for colorList
function getRectangleData(c) {
  var points  = [];
  var colors  = [];
  var normals = [];
  var j = c;

  // Push the vertices into points
  //   points are conceived as if we were directly facing that side
  //   e.g. for the front face, we are facing -z
  //        for the back face, we are facing z
    // Right face
  pushFace(points, rectCorners, colors, normals, 2,3,5,4, j);//, 0); //++j;
    // Left face
  pushFace(points, rectCorners, colors, normals, 6,7,1,0, j);//, 9); //++j;
    // Top face
  pushFace(points, rectCorners, colors, normals, 6,0,2,4, j);//, 3); //++j;
    // Bot face
  pushFace(points, rectCorners, colors, normals, 1,7,5,3, j);//, 12); //++j;
    // Front face
  pushFace(points, rectCorners, colors, normals, 0,1,3,2, j);//, 6); //++j;
    // Back face
  pushFace(points, rectCorners, colors, normals, 4,5,7,6, j);//, 15);
    
  //console.log(points);

  return RectangleData = {
    points,
    colors,
    normals,
    rectLength: points.length / 3,
  }
}

// Based off quad() from robotArm.js in the sample
// Helper function to push a rectangle face
function pushFace(dest, source, colors, normals, a,b,c,d, j) {
  // Calculate the surface normal for this face
  n = m4.cross(source[b], source[c]);
  
  pushVertex(dest, source[a], colors, normals, j, n); // top left
  pushVertex(dest, source[b], colors, normals, j, n); // bot left
  pushVertex(dest, source[c], colors, normals, j, n); // top right

  pushVertex(dest, source[a], colors, normals, j, n); // top left
  pushVertex(dest, source[c], colors, normals, j, n); // bot right
  pushVertex(dest, source[d], colors, normals, j, n); // top right
}

// helper function to push rectangle vertices
function pushVertex(dest, source, colors, normals, j, n) {
  dest.push(source[0], source[1], source[2]);
  colors.push(colorList[j], colorList[j+1], colorList[j+2]);
  //normals.push(faceNormals[n], faceNormals[n+1], faceNormals[n+1]);
  normals.push(n[0], n[1], n[2]);
  //console.log(n);
}

// Based off https://webglfundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html
function resize(canvas) {
  // Lookup the size the browser is displaying the canvas.
  var displayWidth  = canvas.clientWidth;
  var displayHeight = canvas.clientHeight;
  
  // Check if the canvas is not the same size.
  if (canvas.width  != displayWidth ||
      canvas.height != displayHeight) {
  
      // Make the canvas the same size
      canvas.width  = displayWidth;
      canvas.height = displayHeight;
  }
}

// Create shaders, essentially provided by webglfundamentals.org
function createShader(gl, type, source) {
  var shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  // Check if it compiled
  var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!success) {
    // Something went wrong during compilation; get the error
    //gl.deleteShader(shader);
    throw "could not compile shader:" + gl.getShaderInfoLog(shader);
  }
 
  return shader;
}

// Create the program, essentially provided by webglfundamentals.org
function createProgram(gl, vertexShader, fragmentShader) {
  var program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  // Check if it linked.
  var success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!success) {
      // something went wrong with the link
      //gl.deleteProgram(program);
      throw ("program failed to link:" + gl.getProgramInfoLog (program));
  }
 
  return program;
}
