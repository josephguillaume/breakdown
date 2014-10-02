var UnivariateAnalysis = Backbone.Model.extend({
	defaults: {
		vars:[],
		output:null,
		base:null,
		univariate_crossover:[]
	},
	initialize:function(){
		//univariateCrossover is called if any of the attributes change
		this.on('change:output',this.univariateCrossover,this);
		this.listenTo(this.get("base"),'change:ranges', this.univariateCrossover, this);
		this.listenTo(this.get("base"),'change:equations', this.univariateCrossover, this);
		this.listenTo(this.get("base"),'change:scens',this.univariateCrossover,this);
	},
	univariateCrossover:function(){
		var model=this;
		var base=model.get("base");
		if(base.get('ranges').length==0) return(this);
		var ranges= {
			Variable:base.get('ranges').map(function(x){return x[0]}),
			Lower:base.get('ranges').map(function(x){return parseFloat(x[1])}),
			Upper:base.get('ranges').map(function(x){return parseFloat(x[5])})
		};
		
		console.log("univariateCrossover");
		var req=ocpu.rpc("univariateCrossover",{
				'equations.scen':base.selectEqns([base.get('scens')[0]]),
				'equations.baseline':base.selectEqns([base.get('scens')[1]]),
				'var':model.get('output'),
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
});

//UnivariateTable: name, slider, levels of comfort, crossover point
//model: ranges, equations, scens, selected_var1, univariate_crossover

var UnivariateTable = Backbone.View.extend({
    initialize: function(){
		this.uniSliders=new RangeSliders({model:this.model.get("base"),el:this.$el,editRange:editRange_placeholder});
		//uniSliders will be updated on render here instead
		this.uniSliders.stopListening();
		
		this.listenTo(this.model.get("base"),'change:selected_var1',this.setselected,this);
		this.listenTo(this.model.get("base"),'change:ranges', this.render, this);
		this.listenTo(this.model,'change:univariate_crossover', this.render, this);
		this.render();
	},
	setselected:function(){
		this.$el.find('input[name="selectedVar"][value="' + this.model.get('base').get('selected_var1') + '"]').prop('checked', true);
	},
    render: function() {
		console.log("render UnivariateTable "+this.output);
		var model=this.model;
		var base=model.get('base');
		data=model.get('univariate_crossover').slice();
		// Calculate data
		var tab=$.map(base.get('ranges'),function(e,i){
			var perc_to_limit=base.normalise(data[i],e[0]);
			var best = base.get('ranges')[i][3];
			var perc_change=null;
			if(best && data[i]) perc_change=(data[i]-best)/best*100;
			var concernClass=null;
			if(1-perc_to_limit>0.75){ concernClass="highconcern"
			} else if(1-perc_to_limit>0.25){concernClass="midconcern"
			} else { concernClass="lowconcern"}
			var row=e.concat(data[i],perc_to_limit,perc_change,concernClass);
			return _.object(["Variable","Lower","Min","Best","Max","Upper","Break","PercToLimit","PercChange","concernClass"],row);
		})
		// Call template
		this.$el.html(_.template($("#univTable_template").html(),{
			tab:tab,
			id:this.$el.prop("id")
		}));
		this.uniSliders.render();
		this.$el.find("input:radio").on('change',function(){base.set('selected_var1',this.value)});
		this.setselected();
		return this;
	}
});