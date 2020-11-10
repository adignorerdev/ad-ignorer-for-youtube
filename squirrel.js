
export class Squirrel {

    constructor( parent, Asset ) {
        this.parent = parent
        this.Asset = Asset

        // Preload images.
        new Image().src = Asset( 'squirrel_0.png' )
        new Image().src = Asset( 'squirrel_1.png' )

        const img = this.img = document.createElement('img')
        parent.appendChild( img )
        img.src = Asset( 'squirrel_0.png' )
        img.style.position = 'fixed'
        img.style.zIndex = 9999999999
        img.style.opacity = 0

        const audio = this.audio = new Audio()
        parent.appendChild( audio )
        audio.src = Asset( 'flying.mp3' )
        audio.volume = 1.0
        audio.play()

        this.location = { x: -100, y: -100 }

        this.state = {
            type: 'entrance',
            target: {
                x: 10 + Math.random() * 100,
                y: 10 + Math.random() * 100
            }
        }
        this.update()
    }

    update() {
        let { location, parent, Asset } = this
        let applyClip = true
        const bounds = parent.getBoundingClientRect()

        if ( this.state.type === 'entrance' ) {
            const { target } = this.state
            const dir = vec.normalize( vec.subtract( target, location ) )
            const moveAmount = 1.0 + Math.random() * 1.0
            let movement = vec.multiply( 
                dir,
                moveAmount
            )
            location = this.location = vec.add( this.location, movement )
            const dist = vec.length(vec.subtract( this.location, target ))
            if ( dist <= 10 ) {
                this.state = {
                    type: 'stationary',
                    since: Date.now(),
                    targetDuration: 3000 + Math.random() * 1000
                }
            }
        }
        if ( this.state.type === 'stationary' ) {
            const { since, targetDuration } = this.state
            const duration = Date.now() - since
            if ( duration >= targetDuration ) {
                this.img.src = Asset( 'squirrel_1.png' )
                this.state = {
                    type: 'leave',
                    target: {
                        x: bounds.right + 200,
                        y: Math.random() * bounds.height
                    },
                    since: Date.now()
                }
            }
            this.img.style.transform = `rotate3d( 1, 1, 1, ${ Math.sin( duration / 1000 ) * 45 }deg )`
            applyClip = false
        }
        if ( this.state.type === 'leave' ) {
            const { target, since } = this.state
            const dir = vec.normalize( vec.subtract( target, location ) )
            const moveAmount = 5.0 + Math.random() * 2.0
            let movement = vec.multiply( 
                dir,
                moveAmount
            )
            location = this.location = vec.add( this.location, movement )

            const duration = Date.now() - since
            this.audio.volume = Math.max( 0, 1.0 - duration / 2000 )

            if ( location.x > bounds.width + 100 && this.audio.volume <= 0.05 ) {
                this.state = {
                    type: 'gone'
                }
            }
        }

        // Apply location.
        const randDir = vec.multiply({
            x: Math.random() * 2 - 1,
            y: Math.random() * 2 - 1
        }, Math.random() * 5.0)
        const locationOffset = vec.multiply( randDir, Math.random() * 1.0 )
        this.img.style.left = bounds.left + location.x + locationOffset.x - window.scrollX + 'px'
        this.img.style.top = bounds.top + location.y + locationOffset.y - window.scrollY + 'px'

        // Clip img so that its not visible outside its parent.
        if ( applyClip ) {
            const iBounds = this.img.getBoundingClientRect()
            const intersectingBounds = this.intersection( bounds, iBounds )
            if ( ! intersectingBounds ) {
                this.img.style.opacity = 0
            } else {
                this.img.style.opacity = 1
                const clip = {
                    left: Math.ceil( intersectingBounds.x - iBounds.x ),
                    top: Math.ceil( intersectingBounds.y - iBounds.y ),
                    right: Math.ceil( iBounds.right - ( intersectingBounds.x + intersectingBounds.width )  ),
                    bottom: Math.ceil( iBounds.bottom - ( intersectingBounds.y + intersectingBounds.height ) ),
                }
                this.img.style.clipPath = `inset(${ clip.top }px ${clip.right}px ${clip.bottom}px ${clip.left}px)`
            }
        } else {
            this.img.style.clipPath = ''
            this.img.style.opacity = 1
        }

        if ( this.state.type !== 'gone' ) {
            requestAnimationFrame( this.update.bind( this ) )
        } else {
            this.remove()
        }
    }

    remove() {
        this.parent.removeChild(this.img)
        this.parent.removeChild( this.audio )
        if ( this.onOver ) {
            this.onOver()
        }
    }

    onOver( clbk ) {
        this.onOver = clbk
    }

    intersection( a, b ) {
        const x = Math.max( a.x, b.x )
        const num1 = Math.min( a.x + a.width, b.x + b.width )
        const y = Math.max( a.y, b.y )
        const num2 = Math.min( a.y + a.height, b.y + b.height )
        if ( num1 >= x && num2 >= y ) {
            return { x, y, width: num1 - x, height: num2 - y }
        } else {
            return undefined
        }
    }

}


const point3D = ( x, y ) => ({x, y})
/**
 * Collection of math utilities for numeric Vec3s.
 * @hidden
 */
export const vec = {
    add( v1, ...v2 ) {
        const result = { x: v1.x, y: v1.y, z: v1.z }
        for ( const v of v2 ) {
            result.x += v.x
            result.y += v.y
        }
        return result
    },
    subtract( v1, v2 ) {
        return point3D(
            v1.x - v2.x,
            v1.y - v2.y,
        )
    },
    multiply( v, multiplier ) {
        return point3D(
            v.x * multiplier,
            v.y * multiplier,
        )
    },
    divide( v, divisor ) {
        return point3D(
            v.x / divisor,
            v.y / divisor,
        )
    },
    multiplyVec( v1, v2 ) {
        return point3D(
            v1.x * v2.x,
            v1.y * v2.y,
        )
    },
    divideVec( v1, v2 ) {
        return point3D(
            v1.x / v2.x,
            v1.y / v2.y,
        )
    },
    length( v ) {
        return Math.sqrt( v.x * v.x + v.y * v.y )
    },
    normalize( v ) {
        return vec.divide( v, vec.length( v ) )
    },
    dot( v1, v2 ) {
        return v1.x * v2.x + v1.y * v2.y
    },
    cross( v1, v2 ) {
        return point3D(
            v1.y * v2.z - v1.z * v2.y,
            v1.z * v2.x - v1.x * v2.z,
        )
    },
    /**
     * @returns     Radian angle between v1 and v2.
     */
    angle( v1, v2 ) {
        return Math.acos( vec.dot( v1, v2 ) / ( vec.length( v1 ) * vec.length( v2 ) ) )
    },
    /**
     * Linear interpolation between two vectors and an arbitrary amount as %.
     * amount = 0 -> returns a
     * amount = 1 -> returns b
     */
    lerp( a, b, amount ) {
        amount = Math.max( Math.min( amount, 1 ), 0 )
        return vec.add(
            vec.multiply( a, 1 - amount ),
            vec.multiply( b, amount )
        )
    },
    /**
     * Get vector as absolute..
     */
    abs( v ) {
        return { x: Math.abs( v.x ), y: Math.abs( v.y ) }
    }

}
