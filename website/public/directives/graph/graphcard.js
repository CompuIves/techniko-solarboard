app.directive('ngGraph', function(generated, moment, weather, datepicker) {
    return {
        restrict: 'AE',
        templateUrl: './directives/graph/graphcard.html',
        scope: {
            title: "@",
            graphDate: "="
        },
        link: function(scope, iElement, attr, ctrl) {
            scope.graph = {
                options: {
                    xAxis: {
                        type: 'datetime',
                        title: {
                            text: "Tijdstip"
                        }
                    },

                    yAxis: [{
                        labels: {
                            format: "{value} kWh"
                        },
                        floor: 0,
                        title: {
                            text: "Opgewekt"
                        }
                    }, {
                        labels: {
                            format: "{value} W"
                        },
                        floor: 0,
                        opposite: true,
                        title: {
                            text: "Output"
                        }
                    }],

                    chart: {
                        zoomType: "x",
                        events: {
                            drilldown: function(e) {
                                scope.$apply(function() {
                                    if (datepicker.month) {
                                        datepicker.day = moment.utc(e.point.x / 1000, 'X').date();
                                    } else if (datepicker.year) {
                                        datepicker.month = moment.utc(e.point.x / 1000, 'X').format('MMMM');
                                    }
                                });
                            }
                        }
                    },

                    plotOptions: {
                        series: {
                            stacking: 'normal',
                            marker: {
                                enabled: false
                            }
                        }
                    },
                    tooltip: {
                        shared: true
                    }
                },
                title: {
                    text: ""
                },
                series: []
            };

            scope.$watch('graphDate', function(newValue, oldValue) {
                if (!newValue) {
                    newValue = {
                        date: moment.utc().startOf('day').format('X'),
                        type: 'day'
                    };
                }
                scope.graph.series = [];
                processDate(newValue);
            }, true);

            var processDate = function(date) {
                switch (date.type) {
                    case 'year':
                        addYear(date.date);
                        break;
                    case 'month':
                        addMonth(date.date);
                        break;
                    case 'day':
                        addDay(date.date, scope.graph.series);
                        break;
                }
            };

            var addDay = function(unixDay, series) {
                generated.getDay(unixDay).then(function(data) {
                    if (data) {
                        scope.graph.options.xAxis = [];
                        scope.graph.options.yAxis = [];
                        scope.graph.options.xAxis.push({
                            type: 'datetime',
                            title: {
                                text: "Tijdstip"
                            }
                        });

                        scope.graph.options.yAxis.push({
                            labels: {
                                format: "{value} kWh"
                            },
                            floor: 0,
                            title: {
                                text: "Opgewekt"
                            }
                        });
                        scope.graph.options.yAxis.push({
                            labels: {
                                format: "{value} W"
                            },
                            floor: 0,
                            opposite: true,
                            title: {
                                text: "Output"
                            }
                        });

                        var day = moment(unixDay, 'X').startOf('day');
                        var unixDate = Date.UTC(day.year(), day.month(), day.date());
                        var outputData = [];
                        var present = moment();
                        var maxDay = moment(day).add(1, 'days');
                        data.data.forEach(function(solar) {
                            var total = 0;
                            var yieldData = [];
                            var i = 0;
                            while (day < present && day < maxDay) {
                                var generated = solar[day.hours()][day.minutes() / 5];
                                if (!generated) generated = 0;
                                total += generated;
                                yieldData.push(Math.round((total / 1000) * 1000000) / 1000000);

                                if (!outputData[i]) outputData[i] = 0;
                                outputData[i] += Math.round(generated * 3600 / 300 * 100) / 100; //Get output by dividing with an hour (Wh / hour = W)
                                day.add(5, 'minutes');
                                i++;
                            }
                            day.subtract(1, 'hours').startOf('day');


                            series.push({
                                name: solar.solar,
                                type: 'areaspline',
                                data: yieldData,
                                tooltip: {
                                    valueSuffix: " kWh"
                                },
                                yAxis: 0,
                                xAxis: 0,
                                pointStart: unixDate,
                                pointInterval: 1000 * 60 * 5
                            });
                        });

                        if (outputData.length !== 0) {
                            series.push({
                                name: "Output",
                                type: "spline",
                                data: outputData,
                                tooltip: {
                                    valueSuffix: " W"
                                },
                                yAxis: 1,
                                xAxis: 0,
                                pointStart: unixDate,
                                pointInterval: 1000 * 60 * 5
                            });
                        }
                    }
                });
            };

            function addMonth(month) {
                generated.getMonth(month, true).then(function(data) {
                    if (data) {
                        scope.graph.options.xAxis = [];
                        scope.graph.options.yAxis = [];
                        scope.graph.options.xAxis.push({
                            type: 'datetime',
                            dateTimeLabelFormats: {
                                day: '%e %b'
                            },
                            title: {
                                text: "Datum"
                            }
                        });

                        scope.graph.options.yAxis.push({
                            labels: {
                                format: "{value} kWh"
                            },
                            floor: 0,
                            title: {
                                text: "Opgewekt"
                            }
                        });

                        processData(data);
                    }
                });
            }

            function addYear(year) {
                generated.getYear(year).then(function(data) {
                    if (data) {
                        scope.graph.options.xAxis = [];
                        scope.graph.options.yAxis = [];
                        scope.graph.options.xAxis.push({
                            type: 'datetime',
                            dateTimeLabelFormats: {
                                day: '%B',
                                month: '%B'
                            },
                            title: {
                                text: "Maand"
                            }
                        });

                        scope.graph.options.yAxis.push({
                            labels: {
                                format: "{value} kWh"
                            },
                            floor: 0,
                            title: {
                                text: "Opgewekt"
                            }
                        });

                        processData(data);
                    }
                });
            }

            function processData(data) {
                for (var i = 0; i < data.data.length; i++) {
                    var generatedData = [];
                    if (data.data[i]) {
                        var unixDate = new Date(data.data[i].date).getTime();
                        generatedData.push({
                            x: unixDate,
                            y: data.data[i].total,
                            drilldown: true
                        });


                        var solarSeries = getSolarFromSeries(scope.graph.series, data.data[i].solar);

                        if (solarSeries) {
                            solarSeries.data = solarSeries.data.concat(generatedData);
                        } else {
                            scope.graph.series.push({
                                name: data.data[i].solar,
                                type: "column",
                                data: generatedData
                            });
                        }
                    }
                }
            }

            var getSolarFromSeries = function(series, name) {
                for (var i = 0; i < series.length; i++) {
                    if (series[i].name == name)
                        return series[i];
                }
            };

        }
    };
});