
// http://mounirmesselmeni.github.io/2012/11/20/javascript-csv/
readCsv = function(files,handler,separator){
	if(!separator) separator=","
	if (window.FileReader) {
		var reader = new FileReader();
		if(files.length==0) return null;
		reader.readAsText(files[0]);
		reader.onload = function(event){
			//http://code.google.com/p/jquery-csv/downloads/list
			var result = $.csv.toArrays(event.target.result,{separator:separator});
			//console.log(result);
			handler(result);
		};
		reader.onerror = function(event){
		    if(evt.target.error.name == "NotReadableError") {
				alert("Cannot read file !");
			}
		};
    } else {
        alert('FileReader are not supported in this browser.');
    }
}

var Analysis = Backbone.Model.extend({
	defaults: {
		equations: [],
		header:["Variable"],
		ranges:[],
		univariate_crossover:[],
		scens:[1,2],
		selected_var1: null,
		ranges_cols:["Variable","Lower","Min","Best","Max","Upper"],
		showEquation:false
	},
	EquationsfromCSV:function(csv){
		console.log("EquationsfromCSV");
		this.set('header',csv[0])
		csv.splice(0,1); //remove header
		this.set('equations',csv);
		return this;
	},
	AllFromCSV:function(csv){
		console.log("AllFromCSV");
		//Equations header
		var header=csv[0].slice(10,csv[0].length);
		header.unshift(csv[0][0]);
		this.set('header',header);
		//Equations
		var equations=csv.map(function(x){
			var row=x.slice(10,csv[0].length);
			row.unshift(x[0]);
			return row
		});
		equations.splice(0,1); //remove header
		this.set('equations',equations);
		//Ranges
		var ranges=csv.map(function(x){
			return x.slice(0,6);
		});
		ranges.splice(0,1); //remove header
		//remove empty rows
		ranges=ranges.filter(function(v,i){return v[1]!=""|v[2]!=""|v[3]!=""|v[4]!=""|v[5]!=""});
		this.set('ranges',ranges);
		return this;
	},
	AllToCSV:function(){
		// Merge equations,notes,ranges
		var eqns=this.get('equations').map(function(arr){return arr.slice();});
		var vars_eqns=eqns.map(function(x){return x[0]});
		var ranges=this.get('ranges').map(function(arr){return arr.slice();});
		var vars_ranges=ranges.map(function(x){return x[0]});
		var head_eqns=this.get("header").slice();
		head_eqns.splice(0,1);
		var out=[[].concat(
			this.get("ranges_cols"),
			["bestguess","bounds","direction","is.problem"],
			head_eqns
		)];
		$.each(vars_eqns,function(i,v){
			var row_eqns=eqns[i].slice();
			var var_name=row_eqns.splice(0,1);
			var row_notes=["","","",""];
			var row_ranges=["","","","",""];
			var idx_ranges=vars_ranges.indexOf(v);
			if(idx_ranges > -1){
				row_ranges=ranges[idx_ranges].slice();
				row_ranges.splice(0,1);
				for(i=0;i<5;i++){if(!row_ranges[i]){row_ranges[i]=""}}
			}
			out.push([].concat([var_name],row_ranges,row_notes,row_eqns));
		});
		var csv=out.map(function(row){return row.map(function(x){return '"'+(x+'').replace(/"/g,'""')+'"'}).join(";")}).join("\n");
		return csv
	},
	delVar:function(variable,dgname){
		console.log('delVar '+variable+' in '+dgname);
		if(variable==undefined) return(this);
		var vals=this.get(dgname).slice(0); //clone, because otherwise this bypasses set
		var i=vals.map(function(x){return(x[0])}).indexOf(variable);
		vals.splice(i,1);
		this.set(dgname,vals);
		if(variable==this.selected_var1) this.set("selected_var1",null);
		return this;
	},
	selectEqns:function(indices){
		var eqns=this.get('equations').map(function(x){
			// For each row, return name and desired indices
			var row=indices.map(function(i){return x[i]});
			row.unshift(x[0]);
			return row;
		});
		return(eqns);
	},
	getRanges:function(vars,asArray){
		if(!vars) return(null);
		asArray = typeof asArray !== 'undefined' ? asArray : true;
		if(!$.isArray(vars)) var vars=[vars];
		var ranges=this.get('ranges').map(function(arr){return arr.slice();});
		ranges=$.grep(ranges,function(e,i){
				// Return appropriate elements
				return($.inArray(e[0],vars)>-1);
			})
		if(asArray){ return(ranges) };
		ranges = {
			Variable:ranges.map(function(x){return x[0]}),
			Lower:ranges.map(function(x){return parseFloat(x[1])}),
			Min:ranges.map(function(x){return parseFloat(x[2])}),
			Best:ranges.map(function(x){return parseFloat(x[3])}),
			Max:ranges.map(function(x){return parseFloat(x[4])}),
			Upper:ranges.map(function(x){return parseFloat(x[5])}),
		};
		return ranges;
	},	
	normalise:function(x,variable){
		val=parseFloat(x);
		ranges=_.object(this.get("ranges_cols"),this.getRanges(variable)[0]);
		if(!ranges.Best) return(NaN)
		if(!ranges.Min) return(NaN)
		if(!ranges.Max) return(NaN)
		if(Math.abs(x-ranges.Best) < 1e-5){return(0)}
		if(x>ranges.Best){return (x-ranges.Best)/(ranges.Max-ranges.Best)}
		if(x>ranges.Best){return (ranges.Best-x)/(ranges.Best-ranges.Min)}
	},
	evaluate:function(column,variable){
		if(this.get('equations').length==0) return(this)
		//get named vector of equations for the column
		dict={};
		for(i=0;i<this.get('equations').length;i++){
			dict[this.get('equations')[i][0]]=this.get('equations')[i][column]
		}
		var model=this;
		var req=ocpu.rpc("evaluate",{expr:variable,equations:dict},function(data){ 
			console.log('evaluate is setting '+variable+' for column '+column);
			var vals=model.get(variable).slice(0); //clone, because otherwise this bypasses set
			if(vals==undefined) vals=[];
			vals[column]=data[0]; //assuming its a scalar
			model.set(variable,vals);
		})
		req.fail(function(){
			$.messager.show({
					title:'Error',
					msg:req.responseText,
					timeout:5000,
					showType:'slide'
					});
			var vals=model.get(variable).slice(0);
			if(vals==undefined) vals=[];
			vals[column]=NaN;
			model.set(variable,vals);
		});
		return this;
	},
	univariateCrossover:function(output){
		var model=this;
		if(model.get('ranges').length==0) return(this);
		var ranges= {
			Variable:model.get('ranges').map(function(x){return x[0]}),
			Lower:model.get('ranges').map(function(x){return parseFloat(x[1])}),
			Upper:model.get('ranges').map(function(x){return parseFloat(x[5])})
		};
		
		console.log("univariateCrossover");
		var req=ocpu.rpc("univariateCrossover",{
				'equations.scen':model.selectEqns([model.get('scens')[0]]),
				'equations.baseline':model.selectEqns([model.get('scens')[1]]),
				'var':output,
				ranges:ranges
			},function(data){
				//TODO: cannot store results for more than one output
				model.set('univariate_crossover',data);
			})
		req.fail(function(){
			$.messager.show({
					title:'Error',
					msg:req.responseText,
					timeout:5000,
					showType:'slide'
					});
			model.set('univariate_crossover',[]);
		});
	}
	//bivariate
	//equiconcern
	//staged SCE
}); 

var SingleOutputPlot = Backbone.View.extend({
	initialize: function(args){
		this.output=args.output;
		this.model.on('change:ranges', this.render, this);
		this.model.on('change:equations', this.render, this);
		this.model.on('change:selected_var1',this.render,this);
		this.model.on('change:scens',this.render,this);
		var obj=this;
		this.$el.resizable({onStopResize:function(){obj.render()}});
	},
	render:function(){
		console.log("render SingleOutputPlot");
		var model=this.model;
		if(!model || !model.get("selected_var1")) return(this);
		var ranges0=model.getRanges(model.get("selected_var1"));
		if(ranges0.length==0){
			$.messager.show({
			title:'Error',
			msg:"Range not found for variable "+model.get("selected_var1"),
			timeout:5000,
			showType:'slide'
			});
			return(this);
		}
		ranges0=_.object(model.get("ranges_cols"),ranges0[0]);
		this.$el.rplot("plotNPV",{					
					equations:model.selectEqns(model.get('scens')),
					x:model.get("selected_var1"),y:this.output,
					ranges0:ranges0,
					scens:model.get("scens").map(function(i){return model.get('header')[i]})
				})
		return this;
	}
});

var OutputStats = Backbone.View.extend({
    initialize: function(args){
		this.variable=args.variable;
		//if values doesn't exist yet, set it
		if(this.model.get(this.variable)==undefined) {
			this.model.set(this.variable,[NaN,NaN,NaN]);
		}
		this.listenTo(this.model,'change:'+this.variable, this.render, this);	
		this.listenTo(this.model,'change:equations', this.evaluate, this);
		this.listenTo(this.model,'change:scens',this.evaluate, this);
        this.render(); //otherwise will be blank
    }, 
	variable: null,
	evaluate : function(){
		console.log("OutputStats calling evaluate for "+this.variable);
		//TODO: don't necessarily need to re-evaluate every time.
		this.model.evaluate(this.model.get('scens')[1],this.variable); //scen
		this.model.evaluate(this.model.get('scens')[0],this.variable); //baseline
	},
    render: function() {
		var vals=this.model.get(this.variable);
		console.log("OutputStats rendering "+this.variable);
		this.$el.html(_.template($("#outputstats_template").html(),{
			scen:this.model.get('header')[this.model.get('scens')[1]],
			baseline:this.model.get('header')[this.model.get('scens')[0]],
			scen_value:vals[this.model.get('scens')[1]],
			baseline_value:vals[this.model.get('scens')[0]],
			variable:this.variable
			}));
		return this;
	}
});



setDefault=function(model){
	var req=ocpu.rpc("getBottom",{equations:model.get("equations")},function(data){ 
		var ranges=model.get('ranges').map(function(arr){return arr.slice();});
		var current_names=ranges.map(function(x){return x[0]});
		var new_names = _.filter(data,function(v){return !_.contains(current_names,v)})
		var new_items=new_names.map(function(v){return [v]});
		var eqns=model.get('equations');
		$.each(eqns,function(i,v){
			w=new_names.indexOf(v[0]);
			if(w > -1 && !isNaN(parseFloat(v[1]))){
				new_items[w][3]=v[1]
				new_items[w][1]=v[1]*0.01
				new_items[w][5]=v[1]*10
			}
		});
		ranges=ranges.concat(new_items);
		model.set('ranges',ranges);
	});
	req.fail(function(){console.log(req.responseText)});
}


var editRange_placeholder=function(this_var){
	//TODO
	$('#win').html(analysis.getRanges(this_var));
	$('#win').window('open');
}
			
			
// Creates a complete set of sliders - can't change each variable separately anyway in model,
//  so not worth having individual sliders
var RangeSliders = Backbone.View.extend({
    initialize: function(args){
		this.editRange=args.editRange;
		this.listenTo(this.model,'change:ranges',this.render,this);
		//this.render();
	},
    render: function(){
		// TODO: avoid redrawing if only min and max change
		console.log('RangeSliders render '+this.$el.prop("id"));
		var model=this.model;
		var editRange=this.editRange;
		var prefix=this.$el.prop("id")+"_";
		//If there are existing sliders, remove them
		//https://github.com/egorkhmelev/jslider/issues/39
		this.$el.find("input[type='slider']").off();
		this.$el.find("input[type='slider']").removeData("jslider");
		this.$el.find("input[type='slider']+.jslider").remove();
		// Create sliders
		this.$el.find("input[type='slider']").each(function(){
			var id=$(this).prop('id').replace(prefix,"");
			var range=model.getRanges(id,asArray=false); //object is a copy
			if(isNaN(range.Min)) range.Min=range.Lower;
			if(isNaN(range.Max)) range.Max=range.Upper;
			//Define scale
			var scale=[];
			for (var i = 0; i <= 15+1; i++) {scale.push("|");};
			scale[Math.round((range.Best[0]-range.Lower[0])/(range.Upper[0]-range.Lower[0])*15.0)+1]=range.Best;
			
			$(this).slider({ range:true, from: range.Lower[0], to: range.Upper[0], step: (range.Upper[0]-range.Lower[0])/250, round: false, 
				scale:scale,format: { format: "#,##0.#####", locale: 'us' }, dimension:'', skin: "round",
				callback:function(value){
					//Edit model's ranges and reset it
					var data=model.get('ranges').map(function(arr){return arr.slice();});
					index=data.map(function(x){return x[0]}).indexOf(id);
					var vals = value.split(/;/, 2);
					data[index][model.get("ranges_cols").indexOf("Min")]=vals[0];
					data[index][model.get("ranges_cols").indexOf("Max")]=vals[1];
					model.set('ranges',data);
				}
			})
			$(this).slider("value",range.Min[0],range.Max[0]);
			$(this).next(".jslider").find(".jslider-value-to").on('click',function(){editRange(id)});
			$(this).next(".jslider").find(".jslider-value").on('click',function(){editRange(id)});
			$(this).next(".jslider").find(".jslider-label-to").on('click',function(){editRange(id)});
			$(this).next(".jslider").find(".jslider-label").on('click',function(){editRange(id)});
			$(this).next(".jslider").find(".jslider-scale span:not(:empty())").on('click',function(){editRange(id)});
		})
		return this;
	}
});


downloadCSV=function(model){
	var data=model.AllToCSV();
	window.open('data:text/csv;charset=utf8,' + encodeURIComponent(data))
}

var SelectScens = Backbone.View.extend({
	//model is an Analysis
    initialize: function(args){
		//0-based index of model.scens that is linked to this view
		this.wscen=args.wscen;
		this.listenTo(this.model,"change:header",this.render);
		this.listenTo(this.model,"change:scens",this.render);
		this.render();
	},
	render: function(){
		var model=this.model;
		var view=this;
		var opts=model.get("header").map(function(e,i){return {id:i,text:e}})
		opts.splice(0,1);
		if(opts.length==0) opts=[{id:1,text:""},{id:2,text:""}];
		this.$el.combobox({
			valueField:'id',
			textField:'text',
			selectOnNavigation:true,
			data:opts,
			onChange:function(oldval,newval){
				if(oldval==newval) return null;
				if(newval=="") return null;
				if(!newval) return null;
				if(!isNaN(parseInt(newval))) return null;
				var idx=model.get("header").indexOf(newval);
				if(idx>0){
					view.$el.next().find("input").toggleClass("unknown-scen",false);
					var scens=model.get('scens').slice();
					scens[view.wscen]=idx;
					model.set('scens',scens);
				} else {
					view.$el.next().find("input").toggleClass("unknown-scen",true);
				}
			},
			onSelect:function(rec){
				if(!rec) return null;
				view.$el.next().find("input").toggleClass("unknown-scen",false);
				var scens=model.get('scens').slice();
				scens[view.wscen]=rec.id;
				model.set('scens',scens);
			}
		});
		this.$el.combobox('select',model.get('scens')[view.wscen]);
	}
});

addScens=function(model,scen_vals){
	_.each(scen_vals,function(e,wscen){
		var header=model.get('header').slice();
		if(header.indexOf(e)==-1){
			newidx=header.length;
			//create a blank column
			//change directly to not trigger events
			var equations=model.get('equations');
			for(i=0;i<equations.length;i++){if(!equations[i][newidx]){equations[i][newidx]=""}}
			//then add it to the header
			header.push(e);
			model.set('header',header);
			//and set selected scenarios
			var scens=model.get('scens').slice();
			scens[wscen]=newidx;
			model.set('scens',scens);
	}});
};

loadDemo=function(model,url){
	opts={};
	if(!url) opts={url:url}
	var req=ocpu.rpc("getCombinedCSV",opts,function(data){ 
		console.log('loadDemo');
		model.AllFromCSV(data);
	})
}