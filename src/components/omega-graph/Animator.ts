import { D3Node } from "../../utils/types";
import tween from '@tweenjs/tween.js';

export default new class Animator {
    protected animations: {[idNode: string]: [NodeJS.Timeout, D3Node, Function | undefined][]} = {};

    addAnimation(node: D3Node, animator: (node: D3Node, tween: any) => void, interval: number, on_cancel?: (node: D3Node, tween: any) => void) {
        if (!(node.id in this.animations)) {
            this.animations[node.id] = [];
        }

        this.animations[node.id].push(
            [setInterval(() => { animator(node, tween) }, interval), node, on_cancel]
        );

        // lance la première itération
        animator(node, tween);
    }

    cancelFor(node: D3Node) {
        if (this.has(node)) {
            for (const [timeout, n, stopper] of this.animations[node.id]) {
                clearInterval(timeout);
                stopper(n, tween);
            }
            this.animations[node.id] = [];
        }
    }

    cancelAll() {
        tween.removeAll();
        
        for (const e of Object.values(this.animations)) {
            for (const [timeout, n, stopper] of e) {
                clearInterval(timeout);
                if (stopper)
                    stopper(n, tween);

                // @ts-ignore
                n.__threeObj.scale.copy({ x: 1, y: 1, z: 1 });
            }
        }
        this.animations = {};
    }

    protected has(node: D3Node) {
        return node.id in this.animations;
    }
}