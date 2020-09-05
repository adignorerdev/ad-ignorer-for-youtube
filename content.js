console.log(`Youtube Ad Ignorer active.`)
const cs_base = 'ad-ignorer'

//#region ***   Logic of reading Youtube HTML   ***
const Youtube = (() => {
    /**
     * Function that gets the main container DIV of Youtube video, and ads. 
     */
    const getHTML_videoPlayerDiv = () => {
        return document.getElementById( 'movie_player' )
    }

    /**
     * Function that gets the VIDEO element.
     */
    const getHTML_videoPlayer = () => {
        // Find element under video player DIV with tag name "video".
        const videoPlayerDiv = getHTML_videoPlayerDiv()
        return videoPlayerDiv && videoPlayerDiv.getElementsByTagName( 'video' )[0]
    }

    /**
     * Function that gets the skip ad button if present.
     *
     * Eq. "You can skip in 5 seconds".
     */
    const getHTML_skipAdButton = () => {
        // Find element under video player DIV with class name: "ytp-ad-skip-button-text"
        const videoPlayerDiv = getHTML_videoPlayerDiv()
        return videoPlayerDiv && videoPlayerDiv.getElementsByClassName( 'ytp-ad-skip-button-text' )[0]
    }

    /**
     * Function that gets overlay ad HTML element if present.
     *
     * Eq. Advertisement that shows below the video.
     */
    const getHTML_overlayAd = () => {
        return document.getElementsByClassName( 'ytp-ad-image-overlay' )[0]
    }

    /**
     * Function that gets overlay ad message HTML element if present.
     *
     * Eq. "5 seconds to advertisement" 
     */
    const getHTML_overlayAdMessage = () => {
        return document.getElementsByClassName( 'ytp-ad-message-text' )[0]
    }

    /**
     * Check if advertisement is currently running.
     */
    const isAdvertisementPresent = () => {
        // Check video player element for class name "ad-showing".
        const videoPlayerDiv = getHTML_videoPlayerDiv()
        return videoPlayerDiv && videoPlayerDiv.className.includes( 'ad-showing' )
    }

    return {
        getHTML_videoPlayerDiv,
        getHTML_videoPlayer,
        getHTML_skipAdButton,
        getHTML_overlayAd,
        isAdvertisementPresent
    }
})();
//#endregion

//#region ***   Animations   ***
const Animate = (() => {
    const Asset = ( fileName ) => chrome.extension.getURL(`/assets/${ fileName }`)
    const cs_base_animate = cs_base + '_animation'

    const _removeAnimations = () => {
        const divs = [...document.getElementsByClassName( cs_base_animate )]
            .filter( e => e.tagName.toLowerCase() === 'div' )
        for ( const div of divs ) {
            div.remove()
        }
    }

    const Brb = ( target ) => {
        return new Promise( resolve => {
            _removeAnimations()

            const div = document.createElement( 'div' )
            document.body.appendChild( div )
            div.style.opacity = 0
            div.className = cs_base + ' ' + cs_base_animate + ' ' + cs_base_animate + '_brb'

            const sound = document.createElement( 'audio' )
            div.appendChild( sound )
            sound.src = Asset( 'brb.mp3' )
            sound.play()
            
            const picture = document.createElement( 'img' )
            div.appendChild( picture )
            picture.style.transform = 'rotateY(90deg)'
            picture.src = Asset( 'brb.png' )

            // Initial CSS animations.
            requestAnimationFrame(() => {
                div.style.opacity = 1
                picture.style.transform = 'rotateY(0deg)'
            })

            let animationActive = true
            const repositionDiv = () => {
                if ( target ) {
                    const bounds = target.getBoundingClientRect()
                    div.style.left = `${ bounds.left }px`
                    div.style.top = `${ bounds.top }px`
                    div.style.width = `${ bounds.width }px`
                    div.style.height = `${ bounds.height }px`
                }
                if ( animationActive ) requestAnimationFrame( repositionDiv )
            }
            repositionDiv()

            const finish = () => {
                div.style.opacity = 0
                setTimeout(() => {
                    div.remove()
                    animationActive = false
                }, 3000)
            }

            sound.addEventListener( 'ended', e => {
                // Resolve Promise (intermission is ready) and return handle for removing intermission.
                resolve({ finish })
            } )
        } )
    }

    return {
        Brb
    }
})();
//#endregion

//#region ***   Ignore advertisements that stop the video and skip automatically   ***
(async () => {

    const formatVolume = ( volume ) => `${ (volume * 100).toFixed(1) } %`

    let video
    while ( !video ) {
        video = Youtube.getHTML_videoPlayer()
        await new Promise( resolve => setTimeout( resolve, 100 ) )
    }

    const state = {
        advertisement: undefined,
        userVideoVolume: video.volume,
        intermission: undefined
    }
    const check = () => {
        const advertisement = Youtube.isAdvertisementPresent()

        if ( advertisement ) {
            // Mute video during advertisement.
            if ( video.volume > 0 ) {
                console.log(`\tMuting video.`)
                video.volume = 0
            }

            // Skip ad whenever possible (but not during intermission).
            const skipButton = Youtube.getHTML_skipAdButton()
            if ( skipButton && state.intermission === false ) {
                console.log(`\tSkipping Ad.`)
                skipButton.click()
            }
        }

        if ( advertisement !== state.advertisement ) {
            // Advertisement state changed.
            console.log(`Youtube Ad state changed to: ${ advertisement ? 'ON' : 'OFF' }`)
            // If ad is on, mute video, otherwise restore to previous volume.
            if ( advertisement ) {
                // Show intermission animation.
                console.log(`\tShowing intermission animation.`)
                state.intermission = true
                Animate.Brb( Youtube.getHTML_videoPlayer() )
                    .then( handle => {
                        // Animation ready.
                        console.log(`\tIntermission ready. Waiting for ads to end.`)
                        state.intermission = handle
                    })

            } else {
                // Remove intermission if present.
                if ( state.intermission ) {
                    if ( 'finish' in state.intermission ) {
                        state.intermission.finish()
                        console.log(`\tFinish intermission.`)
                    }
                    state.intermission = undefined
                }

                // Restore video volume.
                const volume = state.userVideoVolume
                if ( volume !== undefined ) {
                    console.log(`\tRestoring video volume (${ formatVolume( volume ) }).`)
                    video.volume = volume
                }
            }
        }

        if ( ! advertisement ) {
            // Cache user set video volume.
            const volume = video.volume
            if ( volume !== state.userVideoVolume ) {
                console.log(`\tCaching user video volume (${ formatVolume( volume ) }).`)
                state.userVideoVolume = video.volume
            }
        }

        state.advertisement = advertisement
        requestAnimationFrame( check )
    }
    check()
})();
//#endregion

//#region ***   Hide overlay advertisements ***
(() => {
    const state = {
        overlayAd: undefined
    }
    const check = () => {
        const overlayAd = Youtube.getHTML_overlayAd()

        if ( overlayAd && state.overlayAd === undefined ) {
            // Overlay ad appeared hide it just so its "technically still visible".
            console.log(`\tHiding overlay ad.`)
            overlayAd.style.opacity = 0.05

            // If user puts mouse over ad, hide it completely.
            overlayAd.addEventListener( 'mousemove', e => {
                if ( overlayAd.style.opacity > 0 ) {
                    console.log(`\tCompletely hiding overlay ad.`)
                    overlayAd.style.opacity = 0
                }
            } )
        }

        state.overlayAd = overlayAd
        requestAnimationFrame( check )
    }
    check()
})();
//#endregion
