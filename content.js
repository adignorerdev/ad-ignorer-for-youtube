console.log(`Youtube Ad Ignorer active.`)

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
     */
    const getHTML_skipAdButton = () => {
        // Find element under video player DIV with class name: "ytp-ad-skip-button-text"
        const videoPlayerDiv = getHTML_videoPlayerDiv()
        return videoPlayerDiv && videoPlayerDiv.getElementsByClassName( 'ytp-ad-skip-button-text' )[0]
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
        isAdvertisementPresent
    }
})();
//#endregion

//#region ***   Observe when advertisements come on   ***
(async () => {

    const formatVolume = ( volume ) => `${ (volume * 100).toFixed(1) } %`

    let video
    while ( !video ) {
        video = Youtube.getHTML_videoPlayer()
        await new Promise( resolve => setTimeout( resolve, 100 ) )
    }

    const state = {
        advertisement: undefined,
        userVideoVolume: video.volume
    }
    const check = () => {
        const advertisement = Youtube.isAdvertisementPresent()

        if ( advertisement ) {
            // Skip ad whenever possible.
            const skipButton = Youtube.getHTML_skipAdButton()
            if ( skipButton ) {
                console.log(`\tSkipping Ad.`)
                skipButton.click()
            }
        }

        if ( advertisement !== state.advertisement ) {
            // Advertisement state changed.
            console.log(`Youtube Ad state changed to: ${ advertisement ? 'ON' : 'OFF' }`)
            // If ad is on, mute video, otherwise restore to previous volume.
            if ( advertisement ) {
                console.log(`\tMuting video.`)
                video.volume = 0
            } else {
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

// setInterval(() => {
//     console.log(`video player div: `, Youtube.getHTML_videoPlayerDiv(),
//     `\nvideo player: `, Youtube.getHTML_videoPlayer(),
//     `\nskip add button: `, Youtube.getHTML_skipAdButton(),
//     `\nis add present: `, Youtube.isAdvertisementPresent(),
//     `\n\n`)
// }, 3000)


