var MultivarCrossover = Backbone.Model.extend({
	defaults: {
		vars:[],
		output:null,
		multivar_result:null,
		base:null
	},
	initialize:function(){
		if(!this.get('output')) this.listenTo(this.get("base"),'change:output_var', 
			function(){this.set('output',this.get("base").get('output_var'))}, this);
	},
	crossoverEquiconcern: function(){
		//analysis is to be run on request
		if(!this.get("output")) return this;
		console.log("crossoverEquiconcern");
		var base=this.get("base");
		var model=this;
		var ranges=base.getRanges(this.get("vars"),false);
		var req=ocpu.rpc("crossoverEquiconcern",{
				'equations.scen':base.selectEqns([base.get('scens')[0]]),
				'equations.baseline':base.selectEqns([base.get('scens')[1]]),
				'var':this.get("output"),
				ranges:ranges
		},function(result){
			model.set("multivar_result",result)
		});
		req.fail(function(){
			$.messager.show({
					title:'Error',
					msg:req.responseText,
					timeout:5000,
					showType:'slide'
					});
			model.set("multivar_result",null);
		});
		return this;
	}
});

var MultivarCheckboxTable = Backbone.View.extend({
	//model is a MultivarCrossover
    initialize: function(args){
		this.template=_.template(args.template.html());
		this.listenTo(this.model.get("base"),'change:ranges',this.render,this);
		this.listenTo(this.model,'change:vars',this.setselected,this);
		this.inputId=this.$el.prop("id")+"_var";
		
		this.sliders=new RangeSliders({model:this.model.get("base"),el:this.$el,editRange:editRange_placeholder});
		//sliders will be updated on render here instead
		this.sliders.stopListening();
	},
	setselected:function(){
		var view=this;
		view.$el.find('input[name="'+this.inputId+'"]').prop('checked',false);
	    _.each(view.model.get('vars'),function(val,i,l){
			view.$el.find('input[name="'+view.inputId+'"][value="' + val + '"]').prop('checked', true);
		});
	},
    render: function() {
		console.log("render MultivarCheckboxTable")
		var model=this.model;
		var jq=this.$el;
		var ranges=model.get("base").get('ranges');
		// Call template
		jq.html(this.template({
			ranges:ranges,
			inputId:this.inputId,
			id:this.$el.prop("id")
		}));
		this.sliders.render();
		//should be listenTo?
		jq.find("input:checkbox[name='"+this.inputId+"']").on('change',function(){
			var checked=[];
			jq.find("input:checked").each(function(){checked.push(this.value)});
			model.set('vars',checked)
		});
		this.setselected();
		return this;
	}
});

var MultivarResultsTable = Backbone.View.extend({
	//model is a MultivarCrossover
    initialize: function(args){
		this.univariate=args.univariate;
		this.template=_.template(args.template.html());
		this.listenTo(this.model.get("base"),'change:univariate_crossover',this.render,this);
		this.listenTo(this.model,'change:multivar_result',this.render,this);
	},
    render: function() {
		var model=this.model
		var multvar_result=model.get("multivar_result");
		if(!multvar_result){
			this.$el.html("No results to display");
			return this;
		}
		//TODO: more efficient way of subsetting univar
		var variables=model.get("base").get('ranges').map(function(x){return x[0]});
		var varIdx=model.get("vars").map(function(v){return variables.indexOf(v)});
		var univar=this.univariate.get("univariate_crossover");
		var results={
			Variable:model.get("vars"),
			univar:varIdx.map(function(i){return univar[i]}),
			multvar:multvar_result.values.slice(0)
		}
		var ranges=model.get("base").getRanges(model.get("vars"),false);
		results.Min=ranges.Min;
		results.Max=ranges.Max;
		results.Best=ranges.Best;
		results.change=results.Best.map(function(e,i){return results.multvar[i]-e});
		var names=Object.keys(results);
		//Convert from object of arrays to array of objects
		results=_.zip.apply(_, _.toArray(results)).map(function(x){return _.object(names,x)});
		console.log(results);
		
		this.$el.html(this.template({
			results:results,
			loc:model.get("multivar_result").loc
		}));
	}
});
