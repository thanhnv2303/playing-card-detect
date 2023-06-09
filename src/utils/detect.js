import cv from "@techstark/opencv-js";
import {Tensor} from "onnxruntime-web";
import {renderBoxes} from "./renderBox";
import * as tf from "@tensorflow/tfjs";

/**
 * Detect Image
 * @param {HTMLImageElement} image Image to detect
 * @param {HTMLCanvasElement} canvas canvas to draw boxes
 * @param {ort.InferenceSession} session YOLOv8 onnxruntime session
 * @param {Number} topk Integer representing the maximum number of boxes to be selected per class
 * @param {Number} iouThreshold Float representing the threshold for deciding whether boxes overlap too much with respect to IOU
 * @param {Number} scoreThreshold Float representing the threshold for deciding when to remove boxes based on score
 * @param {Number[]} inputShape model input shape. Normally in YOLO model [batch, channels, width, height]
 */
export const detectImage = async (
    image,
    canvas,
    session,
    topk,
    iouThreshold,
    scoreThreshold,
    inputShape,
    callback = () => {
    }
) => {
    const [modelWidth, modelHeight] = inputShape.slice(2);
    const [input, xRatio, yRatio] = preprocessing(image, modelWidth, modelHeight);
    // const [input, xRatio, yRatio] = preprocessVideo(image, modelWidth, modelHeight,canvas);


    const tensor = new Tensor("float32", input.data32F, inputShape); // to ort.Tensor
    const config = new Tensor(
        "float32",
        new Float32Array([
            topk, // topk per class
            iouThreshold, // iou threshold
            scoreThreshold, // score threshold
        ])
    ); // nms config tensor
    const {output0} = await session.net.run({images: tensor}); // run session and get output layer
    const {selected} = await session.nms.run({detection: output0, config: config}); // perform nms and filter boxes

    const boxes = [];

    // looping through output
    for (let idx = 0; idx < selected.dims[1]; idx++) {
        const data = selected.data.slice(idx * selected.dims[2], (idx + 1) * selected.dims[2]); // get rows
        const box = data.slice(0, 4);
        const scores = data.slice(4); // classes probability scores
        const score = Math.max(...scores); // maximum probability scores
        const label = scores.indexOf(score); // class id of maximum probability scores

        const [x, y, w, h] = [
            (box[0] - 0.5 * box[2]) * xRatio, // upscale left
            (box[1] - 0.5 * box[3]) * yRatio, // upscale top
            box[2] * xRatio, // upscale width
            box[3] * yRatio, // upscale height
        ]; // keep boxes in maxSize range

        boxes.push({
            label: label,
            probability: score,
            bounding: [x, y, w, h], // upscale box
        }); // update boxes to draw later
    }

    renderBoxes(canvas, boxes); // Draw boxes
    callback()
    input.delete(); // delete unused Mat

};

/**
 * Preprocessing image
 * @param {HTMLImageElement} source image source
 * @param {Number} modelWidth model input width
 * @param {Number} modelHeight model input height
 * @return preprocessed image and configs
 */
const preprocessing = (source, modelWidth, modelHeight) => {

    const mat = cv.imread(source); // read from img tag
    const matC3 = new cv.Mat(mat.rows, mat.cols, cv.CV_8UC3); // new image matrix
    cv.cvtColor(mat, matC3, cv.COLOR_RGBA2BGR); // RGBA to BGR

    // padding image to [n x n] dim
    const maxSize = Math.max(matC3.rows, matC3.cols); // get max size from width and height
    const xPad = maxSize - matC3.cols, // set xPadding
        xRatio = maxSize / matC3.cols; // set xRatio
    const yPad = maxSize - matC3.rows, // set yPadding
        yRatio = maxSize / matC3.rows; // set yRatio
    const matPad = new cv.Mat(); // new mat for padded image
    cv.copyMakeBorder(matC3, matPad, 0, yPad, 0, xPad, cv.BORDER_CONSTANT); // padding black

    const input = cv.blobFromImage(
        matPad,
        1 / 255.0, // normalize
        new cv.Size(modelWidth, modelHeight), // resize to model input size
        new cv.Scalar(0, 0, 0),
        true, // swapRB
        false // crop
    ); // preprocessing image matrix

    // release mat opencv
    mat.delete();
    matC3.delete();
    matPad.delete();

    return [input, xRatio, yRatio];
};

/**
 * Preprocess image / frame before forwarded into the model
 * @param {HTMLVideoElement|HTMLImageElement} source
 * @param {Number} modelWidth
 * @param {Number} modelHeight
 * @returns input tensor, xRatio and yRatio
 */
const preprocessVideo = (source, modelWidth, modelHeight, canvas) => {
    const image = captureVideo(source)

    return preprocessing(image, modelWidth, modelHeight);
};

/**
 * Captures a image frame from the provided video element.
 *
 * @param {Video} video HTML5 video element from where the image frame will be captured.
 * @param {Number} scaleFactor Factor to scale the canvas element that will be return. This is an optional parameter.
 *
 * @return {Canvas}
 */
function captureVideo(video, scaleFactor) {
    if(scaleFactor == null){
        scaleFactor = 1;
    }
    var w = video.videoWidth * scaleFactor;
    var h = video.videoHeight * scaleFactor;
    var canvas = document.createElement('canvas');
    canvas.width  = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, w, h);
    return canvas;
}

export const detectFrame = async (
    vidSource,
    canvas,
    session,
    topk,
    iouThreshold,
    scoreThreshold,
    inputShape,
    callback = () => {
    }
) => {
    const imageSource = captureVideo(vidSource);
    await detectImage(
        imageSource,
        canvas,
        session,
        topk,
        iouThreshold,
        scoreThreshold,
        inputShape,
        callback)
}

export const detectVideo = (vidSource,
                            canvasRef,
                            session,
                            topk,
                            iouThreshold,
                            scoreThreshold,
                            inputShape) => {
    /**
     * Function to detect every frame from video
     */
    const detect = async () => {
        if (vidSource.videoWidth === 0 && vidSource.srcObject === null) {
            const ctx = canvasRef.getContext("2d");
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); // clean canvas
            return; // handle if source is closed
        }

        detectFrame(
            vidSource,
            canvasRef,
            session,
            topk,
            iouThreshold,
            scoreThreshold,
            inputShape, () => {
                requestAnimationFrame(detect); // get another frame
            });
    };

    detect(); // initialize to detect every frame
};