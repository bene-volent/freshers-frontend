<script setup>
import { QrcodeStream } from 'vue-qrcode-reader';
const dev = false

const SERVER_LINK = dev ? 'http://127.0.0.1:8000' : 'https://benesspace.pythonanywhere.com/'

import { ref, computed } from 'vue'
const passInfo = ref({
  name: '',
  roll_no: '',
  attended: false,
  year: '',
  branch: '',
  pass_id: ''
})

const root = ref()
const fullscreen = ref(false)

const code = "WHEBHBCEOMCE | " + "4dd1cb40-c638-40ca-9f1e-6b0634259905"
function extractPassID(code) {
  return code.split(' | ')[1]
}

async function getPassInfo(passID) {
  try {
    const options = {
      method: 'get',
    }
    const link = SERVER_LINK + `/api/passes/${passID}`

    let response = await fetch(link, options)
    if (response.ok) {
      response = (await response.json()).pass
      passInfo.value.attended = response.attended
      passInfo.value.name = response.name
      passInfo.value.roll_no = response.roll_no
      passInfo.value.branch = response.branch
      passInfo.value.year = response.year
      passInfo.value.pass_id = passID
    }


  } catch (e) {
    console.error(e)
  }
}


async function markAttendance() {
  if (passInfo.value.pass_id === '' || passInfo.value.attended)
    return
  try {
    const options = {
      method: 'PATCH',
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pass_id: passInfo.value.pass_id }),
    }
    const link = SERVER_LINK + `/api/passes/mark-attendance`

    let response = await fetch(link, options)
    if (response.ok) {
      response = (await response.json())
      passInfo.value.attended = true
    }


  } catch (e) {
    console.error(e)
  }

  alert('Marked')
}

function clearInfo() {
  passInfo.value = {
    ...{
      name: '',
      roll_no: '',
      attended: false,
      year: '',
      branch: '',
      pass_id: ''
    }
  }

}


function onDetect(detectedCodes) {
  const message = detectedCodes.map((code) => code.rawValue)[0]
  const passID = extractPassID(message)
  getPassInfo(passID)
}
const selectedConstraints = ref({ facingMode: 'environment' })
const defaultConstraintOptions = [
  { label: 'rear camera', constraints: { facingMode: 'environment' } },
  { label: 'front camera', constraints: { facingMode: 'user' } }
]
const constraintOptions = ref(defaultConstraintOptions)

async function onCameraReady() {
  // NOTE: on iOS we can't invoke `enumerateDevices` before the user has given
  // camera access permission. `QrcodeStream` internally takes care of
  // requesting the permissions. The `camera-on` event should guarantee that this
  // has happened.
  const devices = await navigator.mediaDevices.enumerateDevices()
  const videoDevices = devices.filter(({ kind }) => kind === 'videoinput')

  constraintOptions.value = [
    ...defaultConstraintOptions,
    ...videoDevices.map(({ deviceId, label }) => ({
      label: `${label} (ID: ${deviceId})`,
      constraints: { deviceId }
    }))
  ]

  error.value = ''
}
/*** track functons ***/

function paintOutline(detectedCodes, ctx) {
  for (const detectedCode of detectedCodes) {
    const [firstPoint, ...otherPoints] = detectedCode.cornerPoints

    ctx.strokeStyle = 'red'

    ctx.beginPath()
    ctx.moveTo(firstPoint.x, firstPoint.y)
    for (const { x, y } of otherPoints) {
      ctx.lineTo(x, y)
    }
    ctx.lineTo(firstPoint.x, firstPoint.y)
    ctx.closePath()
    ctx.stroke()
  }
}
function paintBoundingBox(detectedCodes, ctx) {
  for (const detectedCode of detectedCodes) {
    const {
      boundingBox: { x, y, width, height }
    } = detectedCode

    ctx.lineWidth = 2
    ctx.strokeStyle = '#007bff'
    ctx.strokeRect(x, y, width, height)
  }
}
function paintCenterText(detectedCodes, ctx) {
  for (const detectedCode of detectedCodes) {
    const { boundingBox, rawValue } = detectedCode

    const centerX = boundingBox.x + boundingBox.width / 2
    const centerY = boundingBox.y + boundingBox.height / 2

    const fontSize = Math.max(12, (50 * boundingBox.width) / ctx.canvas.width)

    ctx.font = `bold ${fontSize}px sans-serif`
    ctx.textAlign = 'center'

    ctx.lineWidth = 3
    ctx.strokeStyle = '#35495e'
    ctx.strokeText(detectedCode.rawValue, centerX, centerY)

    ctx.fillStyle = '#5cb984'
    ctx.fillText(rawValue, centerX, centerY)
  }
}
const trackFunctionOptions = [
  { text: 'nothing (default)', value: undefined },
  { text: 'outline', value: paintOutline },
  { text: 'centered text', value: paintCenterText },
  { text: 'bounding box', value: paintBoundingBox }
]
const trackFunctionSelected = ref(trackFunctionOptions[1])


const barcodeFormats = ref({
  qr_code: true,
})
const selectedBarcodeFormats = computed(() => {
  return Object.keys(barcodeFormats.value).filter((format) => barcodeFormats.value[format])
})

const error = ref('')

function onError(err) {
  error.value = `[${err.name}]: `

  if (err.name === 'NotAllowedError') {
    error.value += 'you need to grant camera access permission'
  } else if (err.name === 'NotFoundError') {
    error.value += 'no camera on this device'
  } else if (err.name === 'NotSupportedError') {
    error.value += 'secure context required (HTTPS, localhost)'
  } else if (err.name === 'NotReadableError') {
    error.value += 'is the camera already in use?'
  } else if (err.name === 'OverconstrainedError') {
    error.value += 'installed cameras are not suitable'
  } else if (err.name === 'StreamApiNotSupportedError') {
    error.value += 'Stream API is not supported in this browser'
  } else if (err.name === 'InsecureContextError') {
    error.value +=
      'Camera access is only permitted in secure context. Use HTTPS or localhost rather than HTTP.'
  } else {
    error.value += err.message
  }
}

</script>

<template>

      <div class="container flow">
        <h1 class="title is-3 " style="text-align: center;margin-top: 1rem;">Freshers Marker</h1>

        <div class="camera box">
          <qrcode-stream :constraints="selectedConstraints" :track="trackFunctionSelected.value"
            :formats="selectedBarcodeFormats" @error="onError" @detect="onDetect" @camera-on="onCameraReady" />
        </div>
        <div class="information">
          <p>Name: {{ passInfo.name }}</p>
          <p>Roll Number: {{ passInfo.roll_no }}</p>
          <p>Branch: {{ passInfo.branch }}</p>
          <p>Year: {{ passInfo.year }}</p>
          <p>Attended: {{ passInfo.attended }}</p>
          <!-- <button class="button is-info" :onclick="() => getPassInfo(extractPassID(code))">GET INFO</button> -->
        </div>
        <div class="fixed-grid has-1-cols">
          <div class="grid  buttons">
            <button class="button is-primary is-dark" :onclick="markAttendance">Mark Attendance</button>
            <button class="button is-light" :onclick="clearInfo">Cancel</button>
          </div>
        </div>
      </div>



</template>

<style>
.container {
  max-width: 475px;
  padding-inline: 1rem;
}

.flow>*+* {
  margin-top: 1.5rem
}

.camera {
  padding: 0.75rem;
}
</style>
