import dynamic from 'next/dynamic';
import React from 'react';

const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false
});


// Use the props interface
class PlotlyHierarchicalPlot extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: [props.data],
      layout: this.getInitialLayout(),
      frames: [],
      config: {responsive: true}
    };
  }

  getInitialLayout = () => {
    const style = getComputedStyle(document.documentElement);
    const isLight = style.colorScheme === "light";
    const paperColor = isLight ? "#ffffff" : "#080502";
    const textColor = isLight ? "#080502" : "#ffffff";

    return {
      margin: { l: 0, r: 0, b: 0, t: 0 },
      paper_bgcolor: paperColor,
      plot_bgcolor: paperColor,
      font: { color: textColor }
    };
  }

  render() {
    return (
      <Plot
        data={this.state.data}
        layout={this.state.layout}
        frames={this.state.frames}
        style={{width: "100%", height: "100%"}}
        config={this.state.config}
        onInitialized={(figure) => this.setState(figure)}
        onUpdate={(figure) => this.setState(figure)}
        onClick={this.props.onClick}
      />
    );
  }
}

export default PlotlyHierarchicalPlot;
