import { ExtrudeGeometry, Font, Mesh, MeshBasicMaterial, Object3D } from 'three'
const { TextGeometry } = require('three/examples/jsm/geometries/TextGeometry.js')
const { FontLoader } = require('three/examples/jsm/loaders/FontLoader')
const fontLoader = new FontLoader()
let textFont: Font | undefined = undefined
fontLoader.loadAsync('./fonts/opensans.json').then((font: Font) => {
    textFont = font
})

export class Text3D extends Mesh {
    constructor(text: string){
        
        if(!textFont){
            throw new Error('Font not initialized')
        }
        const textGeom: ExtrudeGeometry = new TextGeometry(text, {
            font: textFont,
            size: 1,
            height: 2,
            bevelEnabled: false,
            bevelThickness: 1,
            bevelSize: 1,
            bevelOffset: 0,
            bevelSegments: 5
        })


        super(textGeom, new MeshBasicMaterial({
            color: 0x00ff00
        }))
    }
}