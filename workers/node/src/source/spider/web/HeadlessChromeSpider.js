// @flow
import HTMLSpider from "./HTMLSpider";
import { override } from "core-decorators";
import { errorLogger } from "../../../utils/logger";
const CDP = require("chrome-remote-interface");

/**
 * @function 利用无界面 Chrome 浏览器抓取数据
 * @refer https://chromium.googlesource.com/chromium/src/+/lkgr/headless/README.md
 * @refer https://hub.docker.com/r/justinribeiro/chrome-headless/
 * @refer https://github.com/cyrus-and/chrome-remote-interface
 * @refer https://chromedevtools.github.io/debugger-protocol-viewer/tot/Input/
 */
export default class HeadlessChromeSpider extends HTMLSpider {
  // Chrome 所属主机地址
  host: string = "localhost";

  // Chrome 所用端口
  port: number = 9222;

  // 页面加载多少毫秒之后返回
  delay: number = 0;

  /**
   * @function 设置浏览器选项
   * @param host
   * @param port
   * @param delay
   * @returns {HeadlessChromeSpider}
   */
  setChromeOption(host?: string, port?: number, delay?: number) {
    host && (this.host = host);
    port && (this.port = port);
    delay && (this.delay = delay);

    return this;
  }

  /**
   * @function 数据抓取
   * @param url
   * @param option
   * @returns {Promise}
   */
  @override async fetch(url: string, option: Object): Promise<any> {
    return new Promise(async (resolve, reject) => {
      // 设置抓取过时，最多 1 分钟
      setTimeout(() => {
        reject(
          new Error(
            JSON.stringify({
              spiderName: this.name,
              message: "抓取超时",
              url: this.url,
              time: new Date()
            })
          )
        );
      }, 60 * 1000);

      CDP(
        {
          host: this.host,
          port: this.port
        },
        client => {
          // 设置网络与页面处理句柄
          const { Network, Page, Runtime } = client;

          Promise.all([Network.enable(), Page.enable(), Runtime.enable()])
            .then(() => {
              return Page.navigate({
                url
              });
            })
            .catch(err => {
              console.error(err);
              client.close();
            });

          Network.requestWillBeSent(params => {
            // console.log(params.request.url);
          });

          Page.loadEventFired(() => {
            setTimeout(() => {
              Runtime.evaluate({
                expression: "document.body.outerHTML"
              }).then(result => {
                resolve(result.result.value);
                client.close();
              });
            }, this.delay);
          });
        }
      ).on("error", err => {
        errorLogger.error(err.message);
      });
    });
  }
}
