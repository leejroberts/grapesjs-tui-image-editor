export default (editor, options = {}) => {
  const remoteIcons = 'https://raw.githubusercontent.com/nhnent/tui.image-editor/production/dist/svg/';
  const opts = { ...{
    // TOAST UI's configurations
    // http://nhnent.github.io/tui.image-editor/latest/ImageEditor.html
    config: {},

    // Pass the editor constructor. By default, the `tui.ImageEditor` will be called
    constructor: '',

    // Label for the image editor (used in the modal)
    labelImageEditor: 'Image Editor',

    // pass function to get image url. By default, this.target.get("src") will be called
    // must return either an image url or a standard url, receives this.target as an argument
    getImageURL: null,

    // Label used on the apply button
    labelApply: 'Apply',

    // Label used on the fullscreen button
    labelFullscreen: `Fullscreen`,

    // Default editor height
    height: '650px',

    // Default editor width
    width: '100%',

    // Default full screen height
    fsHeight: '95vh',

    // Default full screen width
    fsWidth: '100%',

    // Setting to whether full screen mode should be exited when the apply button is hit
    exitFullScreenOnApply: true,

    // Id to use to create the image editor command
    commandId: 'tui-image-editor',

    // Icon used in the component toolbar
    toolbarIcon: `<svg viewBox="0 0 24 24">
                    <path d="M20.71 7.04c.39-.39.39-1.04 0-1.41l-2.34-2.34c-.37-.39-1.02-.39-1.41 0l-1.84 1.83 3.75 3.75M3 17.25V21h3.75L17.81 9.93l-3.75-3.75L3 17.25z">
                    </path>
                  </svg>`,

    // Hide the default editor header
    hideHeader: 1,

    // By default, GrapesJS takes the modified image, adds it to the Asset Manager and update the target.
    // If you need some custom logic you can use this custom 'onApply' function
    // eg.
    // onApply: (imageEditor, imageModel) => {
    //   const dataUrl = imageEditor.toDataURL();
    //   editor.AssetManager.add({ src: dataUrl }); // Add it to Assets
    //   imageModel.set('src', dataUrl); // Update the image component
    // }
    onApply: 0,

    // If no custom `onApply` is passed and this option is `true`, the result image will be added to assets
    addToAssets: 1,

    // If no custom `onApply` is passed, on confirm, the edited image, will be passed to the AssetManager's
    // uploader and the result (eg. instead of having the dataURL you'll have the URL) will be
    // passed to the default `onApply` process (update target, etc.)
    upload: 0,

    // The apply button (HTMLElement) will be passed as an argument to this function, once created.
    // This will allow you a higher customization.
    onApplyButton: () => {},

    // The TOAST UI editor isn't compiled with icons, so generally, you should download them and indicate
    // the local path in the `includeUI.theme` configurations.
    // Use this option to change them or set it to `false` to keep what is come in `includeUI.theme`
    // By default, the plugin will try to use the editor's remote icons (which involves a cross-origin async
    // request, indicated as unsafe by most of the browsers)
    icons: {
      'menu.normalIcon.path': `${remoteIcons}icon-d.svg`,
      'menu.activeIcon.path': `${remoteIcons}icon-b.svg`,
      'menu.disabledIcon.path': `${remoteIcons}icon-a.svg`,
      'menu.hoverIcon.path': `${remoteIcons}icon-c.svg`,
      'submenu.normalIcon.path': `${remoteIcons}icon-d.svg`,
      'submenu.activeIcon.path': `${remoteIcons}icon-c.svg`,
    },

    // Scripts to load dynamically in case no TOAST UI editor instance was found
    script: [
        'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/1.6.7/fabric.min.js',
        'https://uicdn.toast.com/tui.code-snippet/v1.5.0/tui-code-snippet.min.js',
        'https://uicdn.toast.com/tui-color-picker/v2.2.0/tui-color-picker.min.js',
        'https://uicdn.toast.com/tui-image-editor/v3.4.0/tui-image-editor.min.js'
      ],

    // In case the script is loaded this style will be loaded too
    style: [
      'https://uicdn.toast.com/tui-color-picker/v2.2.0/tui-color-picker.min.css',
      'https://uicdn.toast.com/tui-image-editor/v3.4.0/tui-image-editor.min.css'
    ],
  },  ...options };

  const { script, style, height, width, hideHeader, icons, onApply, upload, addToAssets, commandId } = opts;
  const getConstructor = () => opts.constructor || (window.tui && window.tui.ImageEditor);
  let constr = getConstructor();

  // Dynamic loading of the image editor scripts and styles
  if (!constr && script) {
    const { head } = document;
    const scripts = Array.isArray(script) ? [...script] : [script];
    const styles = Array.isArray(style) ? [...style] : [style];
    const appendStyle = styles => {
      if (styles.length) {
        const link = document.createElement('link');
        link.href = styles.shift();
        link.rel = 'stylesheet';
        head.appendChild(link);
        appendStyle(styles);
      }
    }
    const appendScript = scripts => {
      if (scripts.length) {
        const scr = document.createElement('script');
        scr.src = scripts.shift();
        scr.onerror = scr.onload = appendScript.bind(null, scripts);
        head.appendChild(scr);
      } else {
        constr = getConstructor();
      }
    }
    appendStyle(styles);
    appendScript(scripts);
  }

  // Update image component toolbar
  const domc = editor.DomComponents;
  const typeImage = domc.getType('image').model;
  domc.addType('image', {
    model: {
      initToolbar() {
        typeImage.prototype.initToolbar.apply(this, arguments);
        const tb = this.get('toolbar');
        const tbExists = tb.some(item => item.command === commandId);

        if (!tbExists) {
          tb.unshift({
            command: commandId,
            label: opts.toolbarIcon,
          });
          this.set('toolbar', tb);
        }
      }
    }
  })

  // Add the image editor command
  editor.Commands.add(commandId, {
    run(ed, s, options = {}) {
      const { id } = this;

      if (!constr) {
        ed.log('TOAST UI Image editor not found', {
          level: 'error',
          ns: commandId,
        });
        return ed.stopCommand(id);
      }

      this.editor = ed;
      this.target = options.target || ed.getSelected();
      const content = this.createContent();
      const title = opts.labelImageEditor;
      const applyBtn = content.querySelector('#tui-image-apply');
      const fullscreenBtn = content.querySelector('#tui-image-full-screen');
      ed.Modal.open({ title, content })
        .getModel().once('change:open', () => ed.stopCommand(id));
      // wait for image path to create editor
      this.getImagePath().then(imagePath => {
        this.imageEditor = new constr(content.children[0], this.getEditorConfig(imagePath));
      });
      ed.getModel().setEditing(1);
      applyBtn.onclick = () => this.applyChanges();
      fullscreenBtn.onclick = () => this.toggleFullscreen();
      this.addFullScreenChangeHandler();
      opts.onApplyButton(applyBtn);
    },

    stop(ed) {
      const { imageEditor } = this;
      imageEditor && imageEditor.destroy();
      ed.getModel().setEditing(0);
    },

    getEditorConfig(path) {
      const config = { ...opts.config };
      if (!config.includeUI) config.includeUI = {};
      const fullscreenElement = document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement;
      let uiSizeOpts = {};
      if (fullscreenElement) {
        uiSizeOpts = { height: opts.fsHeight, width: opts.fsWidth };
      } else {
        uiSizeOpts = { height: opts.height, width: opts.width };
      }

      config.includeUI = {
        theme: {},
        ...config.includeUI,
        loadImage: { path, name: 1 },
        uiSize: uiSizeOpts,
      };
      if (hideHeader) config.includeUI.theme['header.display'] = 'none';
      if (icons) config.includeUI.theme = {
        ...config.includeUI.theme,
        ...icons,
      }

      return config;
    },

    // convert all images src's to dataURL's for editor
    // reason: so that AWS S3 bucket does not fail CORS requests from within the tui-image-editor itself
    // cors request will *always* fail if cached in Chrome and Safari, thus the fetch must be { cache: "no-store" }
    async getImagePath() {
      const imageSrc = this.target.get('src');
      const isDataURL = imageSrc.split(":")[0] === 'data';
      if (isDataURL) { return imageSrc; }

      let imageResponse = await fetch(imageSrc, { cache: "no-store" }).then(resp => resp);
      let responseBlob = await imageResponse.blob().then(blob => blob);
      return await this.blobToDataURL(responseBlob).then(result => result);
    },

    createContent() {
      const content = document.createElement('div');
      content.style = 'position: relative';
      content.innerHTML = `
        <div></div>
        <button id="tui-image-apply" class="tui-image-editor__apply-btn" style="
          position: absolute;
          top: 0; right: 0;
          margin: 10px;
          background-color: #fff;
          font-size: 1rem;
          border-radius: 3px;
          border: none;
          padding: 10px 20px;
          cursor: pointer
        ">
          ${opts.labelApply}
        </button>
        <button id="tui-image-full-screen" class="tui-image-editor__apply-btn" style="
          position: absolute;
          top: 0; right: 120px;
          margin: 10px;
          background-color: #fff;
          font-size: 1rem;
          border-radius: 3px;
          border: none;
          padding: 10px 20px;
          cursor: pointer
        ">
          ${opts.labelFullscreen}
        </button>
      `;

      return content;
    },

    applyChanges() {
      const { imageEditor, target, editor } = this;
      const { AssetManager } = editor;

      if (onApply) {
        onApply(imageEditor, target);
      } else {
        if (imageEditor.getDrawingMode() === 'CROPPER') {
          imageEditor.crop(imageEditor.getCropzoneRect()).then(() => {
            this.uploadImage(imageEditor, target, AssetManager);
          });
        } else {
          this.uploadImage(imageEditor, target, AssetManager);
        }
      }

      if (opts.exitFullScreenOnApply) {
        const fullscreenElement = document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement;
        if (fullscreenElement) {
          this.exitFsMode();
        }
      }
    },

    uploadImage(imageEditor, target, am) {
      const dataURL = imageEditor.toDataURL();
      if (upload) {
        const file = this.dataUrlToBlob(dataURL);
        am.FileUploader().uploadFile({
          dataTransfer: { files: [file] }
        }, res => {
          const obj = res && res.data && res.data[0];
          const src = obj && (typeof obj === 'string' ? obj : obj.src);
          src && this.applyToTarget(src);
        });
      } else {
        addToAssets && am.add({
          src: dataURL,
          name: (target.get('src') || '').split('/').pop(),
        });
        this.applyToTarget(dataURL);
      }
    },

    applyToTarget(result) {
      this.target.set({ src: result });
      this.editor.Modal.close();
    },

    blobToDataURL(blob) {
      return new Promise(resolve => {
        const fileReader = new FileReader();
        fileReader.onload = () => resolve(fileReader.result);
        fileReader.readAsDataURL(blob);
      });
    },

    dataUrlToBlob(dataURL) {
      const data = dataURL.split(',');
      const byteStr = window.atob(data[1]);
      const type = data[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteStr.length);
      const ia = new Uint8Array(ab);

      for (let i = 0; i < byteStr.length; i++) {
          ia[i] = byteStr.charCodeAt(i);
      }

      return new Blob([ab], { type });
    },

    // resets the image editor UI size when entering/exiting fullscreen
    addFullScreenChangeHandler() {
      const that = this;
      // Add callback to handle fullscreen change
      if (document.addEventListener) {
        document.addEventListener('webkitfullscreenchange', handleFsChange, false);
        document.addEventListener('mozfullscreenchange', handleFsChange, false);
        document.addEventListener('fullscreenchange', handleFsChange, false);
        document.addEventListener('MSFullscreenChange', handleFsChange, false);
      }

      function handleFsChange() {
        const fullscreenElement = document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement;
        const imageEditorUiSizeOpts = {};
        if (!fullscreenElement) {
          imageEditorUiSizeOpts['uiSize'] = { width: opts.width, height: opts.height };
        } else {
          imageEditorUiSizeOpts['uiSize'] = { width: opts.fsWidth, height: opts.fsHeight };
        }

        that.imageEditor.ui.resizeEditor(imageEditorUiSizeOpts);
      }
    },

    toggleFullscreen() {
      const modalContentEl = this.editor.Modal.getContentEl();
      let modalDialogEl = modalContentEl && modalContentEl.parentElement && modalContentEl.parentElement.parentElement ?
        modalContentEl.parentElement.parentElement :
        modalContentEl;

      const fullscreenElement = document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement;

      if (fullscreenElement) {
        this.exitFsMode();
      } else {
        if (modalDialogEl) {
          if (modalDialogEl.requestFullscreen) {
            modalDialogEl.requestFullscreen();
          } else if (modalDialogEl.webkitRequestFullscreen) {
            modalDialogEl.webkitRequestFullscreen();
          } else if (modalDialogEl.mozRequestFullScreen) {
            modalDialogEl.mozRequestFullScreen();
          } else if (modalDialogEl.msRequestFullscreen) {
            modalDialogEl.msRequestFullscreen();
          }
        }
      }
    },

    exitFsMode() {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    },
  });
};
