// @flow

import React, { Component } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const getHTML = (svgContent, style) => {
  if (!svgContent.includes("viewBox")) {
    // if no viewBox, add a viewBox with the same height and width as the svg
    // (I assume that no viewBox means the <svg> tag has a height and width)
    // Any improvements on the regex is appreciated

     try{
      height = svgContent.match(/(?:height ?= ?(?:"|'))([0-9]+\.?[0-9]*)(?=(?:"|'))/)[1];
      width = svgContent.match(/(?:width ?= ?(?:"|'))([0-9]+\.?[0-9]*)(?=(?:"|'))/)[1];
      svgContent = svgContent.replace(`<svg`, `<svg viewBox="0 0 ${width} ${height}"`);
    } catch (error){}
  }

  if (style.width) {
    svgContent = svgContent.replace(
      /(?:width ?= ?(?:"|'))([0-9]+\.?[0-9]*)(?=(?:"|'))/,
      `width="${style.width}"`,
    );
  }

  if (style.height) {
    svgContent = svgContent.replace(
      /(?:height ?= ?(?:"|'))([0-9]+\.?[0-9]*)(?=(?:"|'))/,
      `height="${style.height}"`,
    );
  }
  
  return `
<html data-key="key-${style.height}-${style.width}">
  <head>
    <style>
      html, body {
        margin: 0;
        padding: 0;
        height: 100%;
        width: 100%;
        overflow: hidden;
        background-color: transparent;
      }
      svg {
        position: fixed;
        top: 0;
        left: 0;
        height: 100%;
        width: 100%;
        overflow: hidden;
      }
    </style>
  </head>
  <body>
    ${svgContent}
  </body>
</html>
`;
};

class SvgImage extends Component {
  state = { fetchingUrl: null, svgContent: null };
  isMounted = false
  componentDidMount() {
    this.isMounted = true
    this.doFetch(this.props);
  }
  componentWillReceiveProps(nextProps) {
    const prevUri = this.props.source && this.props.source.uri;
    const nextUri = nextProps.source && nextProps.source.uri;

    if (nextUri && prevUri !== nextUri) {
      this.doFetch(nextProps);
    }
  }
  componentWillUnmount() {
    this.isMounted = false
  }
  doFetch = async props => {
    let uri = props.source && props.source.uri;
    if (uri) {
      props.onLoadStart && props.onLoadStart();
      if (uri.match(/^data:image\/svg/)) {
        const index = uri.indexOf('<svg');
        this.setState({ fetchingUrl: uri, svgContent: uri.slice(index) });
      } else {
        try {
          const res = await fetch(uri);
          if (!this.isMounted) {
            return
          }
          const text = await res.text();
          if (!this.isMounted) {
            return
          }
          this.setState({ fetchingUrl: uri, svgContent: text });
        } catch (err) {
          console.error('got error', err);
        }
      }
      props.onLoadEnd && props.onLoadEnd();
    }
  };
  render() {
    const props = this.props;
    const { svgContent } = this.state;
    if (svgContent) {
      const flattenedStyle = StyleSheet.flatten(props.style) || {};
      const html = getHTML(svgContent, flattenedStyle);

      return (
        <View pointerEvents="none" style={[props.style, props.containerStyle]}>
          <WebView
            originWhitelist={['*']}
            scalesPageToFit={true}
            useWebKit={false}
            style={[
              {
                backgroundColor: 'transparent',
              },
            ]}
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            source={{ html }}
          />
        </View>
      );
    } else {
      return (
        <View
          pointerEvents="none"
          style={[props.containerStyle, props.style]}
        />
      );
    }
  }
}

export default SvgImage;
